export type CustomField = {
  id: string;
  name: string;
  value: string;
};

export type PasswordEntry = {
  id: string;
  /** The profile that owns this entry. Kept on the entry so moving it syncs safely. */
  profileId?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  customFields: CustomField[];
  updatedAt?: number; // Epoch timestamp in milliseconds
  createdAt?: number;
  version?: number;
  isDeleted?: boolean; // Tombstone for sync deletion propagation
  deletedAt?: number | null;
};

export type PasswordProfile = {
  id: string;
  name: string;
  passwords: PasswordEntry[];
  createdAt: number;
  updatedAt?: number;
};

export type AccountAuth = {
  passwordHash?: string;
  authProvider?: "local" | "azure_ad" | "google";
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
};

export type AccountSecurity = {
  passwordSalt?: string;
  encryptedMasterKey?: string;
  masterKeyIv?: string;
  iterations?: number;
};

export type AccountVault = {
  vaultId: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  createdAt: number;
};

export type AccountDevice = {
  deviceId: string;
  deviceName: string;
  clientPlatform?: string;
  lastSyncAt: number;
  createdAt: number;
};

export type AccountItem = {
  id: string;
  email: string;
  displayName: string;
  auth?: AccountAuth;
  security?: AccountSecurity;
  vaults: AccountVault[];
  devices: AccountDevice[];
  status?: "active" | "suspended" | "pending_verification";
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
};

export type SyncProviderType = "azure" | "simulated";

export type CloudSyncConfig = {
  provider: SyncProviderType;
  azureFunctionUrl: string;
  azureFunctionKey: string;
  vaultId: string;
  autoSync: boolean;
  lastSyncedAt: number | null;
};

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export type SyncStats = {
  sentCount: number;
  receivedCount: number;
  totalCount: number;
  lastSyncedAt: number | null;
};

export type SyncResult = {
  success: boolean;
  passwords: PasswordEntry[];
  profiles: PasswordProfile[];
  stats: SyncStats;
  error?: string;
  backend?: string;
};
