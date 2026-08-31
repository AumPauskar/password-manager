import { AccountItem, CloudSyncConfig } from "../types/sync";
import { load } from "@tauri-apps/plugin-store";

const LOCAL_ACCOUNT_STORAGE_KEY = "pw_manager_user_account";

/**
 * Utility: Hashes a string with SHA-256 using Web Crypto API
 */
export async function hashString(input: string, salt: string = ""): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a random crypto salt in hex format
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Helper to build Azure URL with function key as query param
 */
export function buildAzureUrl(baseUrl: string, key?: string): string {
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl);
    if (key && !url.searchParams.has("code")) {
      url.searchParams.set("code", key);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Register a new user account in Cosmos DB / local store
 */
export async function registerAccount(
  displayName: string,
  email: string,
  masterPassword: string,
  config: CloudSyncConfig
): Promise<{ success: boolean; account?: AccountItem; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim() || trimmedEmail.split("@")[0];
    const userId = "usr_" + (await hashString(trimmedEmail)).slice(0, 16);
    const salt = generateSalt();
    const passwordHash = await hashString(masterPassword, salt);
    const defaultVaultId = "vlt_" + userId.replace("usr_", "");
    const now = Date.now();

    const newAccount: AccountItem = {
      id: userId,
      email: trimmedEmail,
      displayName: trimmedName,
      auth: {
        passwordHash,
        authProvider: "local",
        mfaEnabled: false,
      },
      security: {
        passwordSalt: salt,
        iterations: 100000,
      },
      vaults: [
        {
          vaultId: defaultVaultId,
          name: "Personal Vault",
          role: "owner",
          createdAt: now,
        },
      ],
      devices: [
        {
          deviceId: "dev_" + crypto.randomUUID().slice(0, 8),
          deviceName: navigator.userAgent.includes("Mac") ? "MacBook App" : "Desktop Client",
          clientPlatform: navigator.platform || "desktop",
          lastSyncAt: now,
          createdAt: now,
        },
      ],
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    // If using Azure Function, push account to Azure Cosmos DB
    if (config.provider === "azure" && config.azureFunctionUrl) {
      const targetUrl = buildAzureUrl(config.azureFunctionUrl, config.azureFunctionKey);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.azureFunctionKey) {
        headers["x-functions-key"] = config.azureFunctionKey;
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "account-register",
          account: newAccount,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Azure account registration failed: ${errText || response.statusText}`);
      }
    }

    // Save session locally
    await saveAccountLocally(newAccount);

    return { success: true, account: newAccount };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message || "Failed to register account." };
  }
}

/**
 * Sign in existing user account
 */
export async function loginAccount(
  email: string,
  masterPassword: string,
  config: CloudSyncConfig
): Promise<{ success: boolean; account?: AccountItem; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const userId = "usr_" + (await hashString(trimmedEmail)).slice(0, 16);

    let account: AccountItem | null = null;

    // Check Azure Cosmos DB if configured
    if (config.provider === "azure" && config.azureFunctionUrl) {
      const targetUrl = buildAzureUrl(config.azureFunctionUrl, config.azureFunctionKey);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.azureFunctionKey) {
        headers["x-functions-key"] = config.azureFunctionKey;
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "account-get",
          accountId: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.account) {
          account = data.account;
        }
      }
    }

    // Fallback to local store if offline / simulated
    if (!account) {
      account = await getLocalAccount();
    }

    if (!account || account.id !== userId) {
      return { success: false, error: "Account not found with this email. Please check your email or Sign Up." };
    }

    // Verify Password Hash
    if (account.auth?.passwordHash && account.security?.passwordSalt) {
      const computedHash = await hashString(masterPassword, account.security.passwordSalt);
      if (computedHash !== account.auth.passwordHash) {
        return { success: false, error: "Invalid master password. Please try again." };
      }
    }

    account.lastLoginAt = Date.now();
    await saveAccountLocally(account);

    return { success: true, account };
  } catch (err: any) {
    console.error("Login error:", err);
    return { success: false, error: err.message || "Failed to sign in." };
  }
}

/**
 * Update user profile or Master Password
 */
export async function updateAccountDetails(
  currentAccount: AccountItem,
  updates: { displayName?: string; newPassword?: string },
  config: CloudSyncConfig
): Promise<{ success: boolean; account?: AccountItem; error?: string }> {
  try {
    const updatedAccount: AccountItem = {
      ...currentAccount,
      displayName: updates.displayName?.trim() || currentAccount.displayName,
      updatedAt: Date.now(),
    };

    if (updates.newPassword) {
      const newSalt = generateSalt();
      const newHash = await hashString(updates.newPassword, newSalt);
      updatedAccount.auth = {
        ...updatedAccount.auth,
        passwordHash: newHash,
      };
      updatedAccount.security = {
        ...updatedAccount.security,
        passwordSalt: newSalt,
      };
    }

    if (config.provider === "azure" && config.azureFunctionUrl) {
      const targetUrl = buildAzureUrl(config.azureFunctionUrl, config.azureFunctionKey);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.azureFunctionKey) {
        headers["x-functions-key"] = config.azureFunctionKey;
      }

      await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "account-upsert",
          account: updatedAccount,
        }),
      });
    }

    await saveAccountLocally(updatedAccount);
    return { success: true, account: updatedAccount };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update account." };
  }
}

/**
 * Local Account Persistence Helper
 */
export async function saveAccountLocally(account: AccountItem | null): Promise<void> {
  try {
    const store = await load("passwords.json", { autoSave: true, defaults: {} });
    if (account) {
      await store.set(LOCAL_ACCOUNT_STORAGE_KEY, account);
      localStorage.setItem(LOCAL_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } else {
      await store.delete(LOCAL_ACCOUNT_STORAGE_KEY);
      localStorage.removeItem(LOCAL_ACCOUNT_STORAGE_KEY);
    }
  } catch (e) {
    if (account) {
      localStorage.setItem(LOCAL_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(LOCAL_ACCOUNT_STORAGE_KEY);
    }
  }
}

export async function getLocalAccount(): Promise<AccountItem | null> {
  try {
    const store = await load("passwords.json", { autoSave: true, defaults: {} });
    const saved = await store.get<AccountItem>(LOCAL_ACCOUNT_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {}

  try {
    const local = localStorage.getItem(LOCAL_ACCOUNT_STORAGE_KEY);
    if (local) return JSON.parse(local);
  } catch (e) {}

  return null;
}
