import { PasswordEntry, CloudSyncConfig, SyncResult } from "../types/sync";

const SIMULATED_VAULT_KEY = "azure_simulated_cloud_vault";

/**
 * Merges local and remote password vaults based on `updatedAt` timestamps.
 * Resolves conflicts by picking the entry with the latest timestamp.
 * Properly processes tombstones (`isDeleted: true`) so deleted items are removed.
 */
export function mergeVaults(
  localEntries: PasswordEntry[],
  remoteEntries: PasswordEntry[]
): { merged: PasswordEntry[]; sentCount: number; receivedCount: number } {
  const localMap = new Map<string, PasswordEntry>();
  const remoteMap = new Map<string, PasswordEntry>();

  localEntries.forEach(entry => localMap.set(entry.id, entry));
  remoteEntries.forEach(entry => remoteMap.set(entry.id, entry));

  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const mergedWithTombstones: PasswordEntry[] = [];

  let sentCount = 0;
  let receivedCount = 0;

  for (const id of allIds) {
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);

    if (localItem && remoteItem) {
      const localTime = localItem.updatedAt || 0;
      const remoteTime = remoteItem.updatedAt || 0;

      if (localTime >= remoteTime) {
        mergedWithTombstones.push(localItem);
        if (localTime > remoteTime) {
          sentCount++;
        }
      } else {
        mergedWithTombstones.push(remoteItem);
        receivedCount++;
      }
    } else if (localItem) {
      mergedWithTombstones.push(localItem);
      sentCount++;
    } else if (remoteItem) {
      mergedWithTombstones.push(remoteItem);
      receivedCount++;
    }
  }

  // Filter out tombstones for the client's active password list
  const activeEntries = mergedWithTombstones.filter(entry => !entry.isDeleted);

  // Sort merged active entries alphabetically by name
  activeEntries.sort((a, b) => a.name.localeCompare(b.name));

  return { merged: activeEntries, sentCount, receivedCount };
}

/**
 * Performs bi-directional synchronization with Azure Function (Cosmos DB or Blob) or Simulated Sandbox
 */
export async function performCloudSync(
  localEntries: PasswordEntry[],
  config: CloudSyncConfig
): Promise<SyncResult> {
  const now = Date.now();
  
  // Ensure all local entries have an updatedAt timestamp
  const normalizedLocal = localEntries.map(entry => ({
    ...entry,
    updatedAt: entry.updatedAt || now,
    createdAt: entry.createdAt || entry.updatedAt || now,
    isDeleted: Boolean(entry.isDeleted),
  }));

  if (config.provider === "azure") {
    if (!config.azureFunctionUrl) {
      return {
        success: false,
        passwords: localEntries,
        stats: { sentCount: 0, receivedCount: 0, totalCount: localEntries.length, lastSyncedAt: config.lastSyncedAt },
        error: "Azure Function URL is not configured. Please enter your Endpoint URL in Cloud Sync Settings.",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.azureFunctionKey) {
        headers["x-functions-key"] = config.azureFunctionKey;
      }

      let targetUrl = config.azureFunctionUrl;
      try {
        const url = new URL(config.azureFunctionUrl);
        if (config.azureFunctionKey && !url.searchParams.has("code")) {
          url.searchParams.set("code", config.azureFunctionKey);
        }
        targetUrl = url.toString();
      } catch (e) {}

      // Step 1: Send local vault state to Azure Function and fetch remote vault state
      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "sync",
          vaultId: config.vaultId || "default",
          passwords: normalizedLocal,
          lastSyncedAt: config.lastSyncedAt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Azure Function returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const responseData = await response.json();
      
      // Azure function returns sync response object or array
      const remoteEntries: PasswordEntry[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData.passwords)
        ? responseData.passwords
        : [];

      // Step 2: Merge local & remote entries
      const { merged, sentCount, receivedCount } = mergeVaults(normalizedLocal, remoteEntries);

      return {
        success: true,
        passwords: merged,
        backend: responseData.backend || "cosmos",
        stats: {
          sentCount,
          receivedCount,
          totalCount: merged.length,
          lastSyncedAt: now,
        },
      };
    } catch (err: any) {
      console.error("Azure Sync Error:", err);
      return {
        success: false,
        passwords: localEntries,
        stats: { sentCount: 0, receivedCount: 0, totalCount: localEntries.length, lastSyncedAt: config.lastSyncedAt },
        error: err.message || "Failed to communicate with Azure Serverless Function.",
      };
    }
  } else {
    // Simulated Azure Sandbox Mode
    await new Promise(resolve => setTimeout(resolve, 750)); // Realistic network latency simulation

    let simulatedRemoteEntries: PasswordEntry[] = [];
    try {
      const storedVault = localStorage.getItem(SIMULATED_VAULT_KEY);
      if (storedVault) {
        simulatedRemoteEntries = JSON.parse(storedVault);
      } else {
        // Initial seed demo entry in simulated cloud
        simulatedRemoteEntries = [
          {
            id: "cloud-sample-1",
            name: "Azure Portal",
            username: "azureadmin@company.com",
            email: "azureadmin@company.com",
            password: "AzureSuperP@ssw0rd2026!",
            customFields: [{ id: "cf-1", name: "Subscription ID", value: "00000000-0000-0000-0000-000000000000" }],
            updatedAt: now - 3600000,
            isDeleted: false,
          },
        ];
      }
    } catch (e) {
      simulatedRemoteEntries = [];
    }

    const { merged, sentCount, receivedCount } = mergeVaults(normalizedLocal, simulatedRemoteEntries);

    // Save updated simulated remote vault
    try {
      localStorage.setItem(SIMULATED_VAULT_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error("Failed to update simulated Azure vault in local storage", e);
    }

    return {
      success: true,
      passwords: merged,
      backend: "simulated",
      stats: {
        sentCount,
        receivedCount,
        totalCount: merged.length,
        lastSyncedAt: now,
      },
    };
  }
}

/**
 * Simulates a remote edit/creation in the Simulated Azure Vault (for testing receiving cloud data).
 */
export function simulateRemoteAzureUpdate(): PasswordEntry {
  const now = Date.now();
  const sampleEntries = [
    {
      id: "azure-cloud-entry-" + Math.floor(Math.random() * 1000),
      name: "Microsoft 365 Admin",
      username: "clouduser@office.com",
      email: "clouduser@office.com",
      password: "CloudPass#" + Math.floor(Math.random() * 9000 + 1000),
      customFields: [{ id: "c1", name: "Tenant Domain", value: "contoso.onmicrosoft.com" }],
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: "azure-cloud-entry-" + Math.floor(Math.random() * 1000),
      name: "Azure SQL Database",
      username: "dbadmin",
      email: "dbadmin@contoso.com",
      password: "SqlSecretKey@" + Math.floor(Math.random() * 9000 + 1000),
      customFields: [{ id: "c2", name: "Host", value: "contoso-db.database.windows.net" }],
      updatedAt: now,
      isDeleted: false,
    },
  ];

  const newRemoteItem = sampleEntries[Math.floor(Math.random() * sampleEntries.length)];
  newRemoteItem.id = "azure-cloud-" + Date.now();

  let currentVault: PasswordEntry[] = [];
  try {
    const raw = localStorage.getItem(SIMULATED_VAULT_KEY);
    if (raw) currentVault = JSON.parse(raw);
  } catch (e) {}

  currentVault.push(newRemoteItem);
  localStorage.setItem(SIMULATED_VAULT_KEY, JSON.stringify(currentVault));
  return newRemoteItem;
}

/**
 * Resets the simulated Azure vault storage
 */
export function resetSimulatedAzureVault(): void {
  localStorage.removeItem(SIMULATED_VAULT_KEY);
}
