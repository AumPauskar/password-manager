import { useState, useEffect, useCallback, useRef } from "react";
import {
  Key,
  Copy,
  Search,
  Shield,
  Eye,
  EyeOff,
  Plus,
  X,
  ListPlus,
  Save,
  Trash2,
  Edit2,
  Check,
  Cloud,
  RefreshCw,
  AlertCircle,
  Settings,
  User,
  FolderLock,
  Sparkles,
} from "lucide-react";
import { load } from "@tauri-apps/plugin-store";
import "./App.css";
import { PasswordEntry, CloudSyncConfig, SyncStatus, SyncStats, AccountItem, PasswordProfile } from "./types/sync";
import { performCloudSync } from "./services/syncService";
import { getLocalAccount, saveAccountLocally } from "./services/authService";
import CloudSyncModal from "./components/CloudSyncModal";
import AuthModal from "./components/AuthModal";

const DEFAULT_SYNC_CONFIG: CloudSyncConfig = {
  provider: "azure",
  azureFunctionUrl: import.meta.env.VITE_AZURE_FUNCTION_URL as string,
  azureFunctionKey: import.meta.env.VITE_AZURE_FUNCTION_KEY as string,
  vaultId: "default",
  autoSync: true,
  lastSyncedAt: null,
};

export default function App() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [profiles, setProfiles] = useState<PasswordProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>("");
  const profilesRef = useRef(profiles);
  const currentProfileIdRef = useRef(currentProfileId);
  profilesRef.current = profiles;
  currentProfileIdRef.current = currentProfileId;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // User Account State
  const [currentUser, setCurrentUser] = useState<AccountItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync State
  const [syncConfig, setSyncConfig] = useState<CloudSyncConfig>(DEFAULT_SYNC_CONFIG);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | undefined>();
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    sentCount: 0,
    receivedCount: 0,
    totalCount: 0,
    lastSyncedAt: null,
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<PasswordEntry>>({
    name: "",
    username: "",
    email: "",
    password: "",
    customFields: [],
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Trigger sync helper
  const executeSync = useCallback(
    async (currentPasswords: PasswordEntry[], config: CloudSyncConfig) => {
      setSyncStatus("syncing");
      setSyncErrorMessage(undefined);

      const result = await performCloudSync(currentPasswords, config);

      if (result.success) {
        setPasswords(result.passwords);
        setSyncStats(result.stats);
        setHasUnsyncedChanges(false);

        // Sync belongs to the active profile. Keep the profile record in sync too;
        // otherwise the next profile switch or app restart loses the synced data.
        const updatedProfiles = profilesRef.current.map((profile) =>
          profile.id === currentProfileIdRef.current ? { ...profile, passwords: result.passwords } : profile
        );
        setProfiles(updatedProfiles);

        const updatedConfig = { ...config, lastSyncedAt: result.stats.lastSyncedAt };
        setSyncConfig(updatedConfig);

        // Save updated passwords & config to persistent store
        try {
          const store = await load("passwords.json", { autoSave: true, defaults: {} });
          await store.set("passwords", result.passwords);
          await store.set("profiles", updatedProfiles);
          await store.set("sync_config", updatedConfig);
        } catch (err) {
          console.error("Failed to save store after sync:", err);
        }

        setSyncStatus("success");
        setTimeout(() => {
          setSyncStatus("idle");
        }, 3000);
      } else {
        setSyncStatus("error");
        setSyncErrorMessage(result.error);
      }
    },
    []
  );

  useEffect(() => {
    async function initStore() {
      try {
        const store = await load("passwords.json", { autoSave: true, defaults: {} });
        const savedPasswords = await store.get<PasswordEntry[]>("passwords");
        const savedProfiles = await store.get<PasswordProfile[]>("profiles");
        const savedSyncConfig = await store.get<CloudSyncConfig>("sync_config");
        const savedUser = await getLocalAccount();

        if (savedUser) {
          setCurrentUser(savedUser);
        }

        const personal: PasswordProfile = { id: crypto.randomUUID(), name: "Personal", passwords: savedPasswords || [], createdAt: Date.now() };
        const loadedProfiles = savedProfiles?.length ? savedProfiles : [personal];
        const activeProfile = loadedProfiles[0];
        profilesRef.current = loadedProfiles;
        currentProfileIdRef.current = activeProfile.id;
        setProfiles(loadedProfiles);
        setCurrentProfileId(activeProfile.id);
        const loadedPasswords = activeProfile.passwords;
        setPasswords(loadedPasswords);
        await store.set("profiles", loadedProfiles);

        let currentConfig = { ...DEFAULT_SYNC_CONFIG };
        if (savedSyncConfig) {
          currentConfig = {
            ...DEFAULT_SYNC_CONFIG,
            ...savedSyncConfig,
            // Ensure valid Azure provider and endpoint are always used if not explicitly overridden with a valid custom URL
            provider: "azure",
            azureFunctionUrl: savedSyncConfig.azureFunctionUrl || DEFAULT_SYNC_CONFIG.azureFunctionUrl,
            azureFunctionKey: savedSyncConfig.azureFunctionKey || DEFAULT_SYNC_CONFIG.azureFunctionKey,
          };
        }

        if (savedUser && savedUser.vaults?.length > 0 && (!savedSyncConfig?.vaultId || savedSyncConfig.vaultId === "default")) {
          currentConfig.vaultId = savedUser.vaults[0].vaultId;
        }

        setSyncConfig(currentConfig);
        await store.set("sync_config", currentConfig);

        setSyncStats({
          sentCount: 0,
          receivedCount: 0,
          totalCount: loadedPasswords.length,
          lastSyncedAt: currentConfig.lastSyncedAt,
        });

        // Trigger Auto-Sync on startup if enabled
        if (currentConfig.autoSync) {
          executeSync(loadedPasswords, currentConfig);
        }
      } catch (err) {
        console.error("Failed to load store:", err);
      }
    }
    initStore();
  }, [executeSync]);

  const saveToStore = async (newPasswords: PasswordEntry[]) => {
    try {
      const store = await load("passwords.json", { autoSave: true, defaults: {} });
      await store.set("passwords", newPasswords);
      const updatedProfiles = profiles.map((profile) => profile.id === currentProfileId ? { ...profile, passwords: newPasswords } : profile);
      setProfiles(updatedProfiles);
      await store.set("profiles", updatedProfiles);
    } catch (err) {
      console.error("Failed to save to store:", err);
    }
  };

  const switchProfile = async (profile: PasswordProfile) => {
    setCurrentProfileId(profile.id);
    setPasswords(profile.passwords);
    setSearchTerm("");
    setVisiblePasswords({});
    await storeProfiles(profiles.map((item) => item.id === profile.id ? profile : item));
  };

  const createProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    const profile = { id: crypto.randomUUID(), name, passwords: [], createdAt: Date.now() };
    const updated = [...profiles, profile];
    setProfiles(updated);
    setNewProfileName("");
    setIsProfileModalOpen(false);
    await storeProfiles(updated);
    setCurrentProfileId(profile.id);
    setPasswords([]);
    setSearchTerm("");
  };

  const storeProfiles = async (items: PasswordProfile[]) => {
    const store = await load("passwords.json", { autoSave: true, defaults: {} });
    await store.set("profiles", items);
  };

  const deleteCurrentProfile = async () => {
    if (profiles.length <= 1) { alert("You must keep at least one profile."); return; }
    if (!confirm(`Delete the profile \"${profiles.find(p => p.id === currentProfileId)?.name}\" and all its passwords?`)) return;
    const updated = profiles.filter(p => p.id !== currentProfileId);
    setProfiles(updated);
    await storeProfiles(updated);
    setCurrentProfileId(updated[0].id);
    setPasswords(updated[0].passwords);
    setSearchTerm("");
  };

  const handleSaveConfig = async (newConfig: CloudSyncConfig) => {
    setSyncConfig(newConfig);
    try {
      const store = await load("passwords.json", { autoSave: true, defaults: {} });
      await store.set("sync_config", newConfig);
    } catch (err) {
      console.error("Failed to save sync config:", err);
    }
  };

  const handleUserChanged = async (user: AccountItem | null) => {
    setCurrentUser(user);
    await saveAccountLocally(user);

    if (user && user.vaults?.length > 0) {
      const newConfig = { ...syncConfig, vaultId: user.vaults[0].vaultId };
      setSyncConfig(newConfig);
      await handleSaveConfig(newConfig);
      executeSync(passwords, newConfig);
    }
  };

  const handleUpdateVaultId = async (vaultId: string) => {
    const newConfig = { ...syncConfig, vaultId };
    setSyncConfig(newConfig);
    await handleSaveConfig(newConfig);
    executeSync(passwords, newConfig);
  };

  const handleManualSync = async () => {
    await executeSync(passwords, syncConfig);
  };

  const filteredPasswords = passwords.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent, fieldName?: string) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (fieldName) {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleAddNew = () => {
    setNewEntry({
      name: "",
      username: "",
      email: "",
      password: "",
      customFields: [],
    });
    setEditingId(null);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleOpenExisting = (entry: PasswordEntry) => {
    setNewEntry(entry);
    setEditingId(entry.id);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleAddCustomField = () => {
    setNewEntry((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { id: crypto.randomUUID(), name: "", value: "" }],
    }));
  };

  const handleCustomFieldChange = (id: string, field: "name" | "value", value: string) => {
    setNewEntry((prev) => ({
      ...prev,
      customFields: prev.customFields?.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    }));
  };

  const handleRemoveCustomField = (id: string) => {
    setNewEntry((prev) => ({
      ...prev,
      customFields: prev.customFields?.filter((f) => f.id !== id),
    }));
  };

  const handleSaveEntry = () => {
    if (!newEntry.name || !newEntry.password) {
      alert("App Name and Password are required.");
      return;
    }

    const now = Date.now();
    const entry: PasswordEntry = {
      id: editingId || crypto.randomUUID(),
      name: newEntry.name || "",
      username: newEntry.username || "",
      email: newEntry.email || "",
      password: newEntry.password || "",
      customFields: newEntry.customFields || [],
      updatedAt: now,
      createdAt: editingId ? undefined : now,
      isDeleted: false,
    };

    let newPasswords: PasswordEntry[];
    if (editingId) {
      newPasswords = passwords.map((p) => (p.id === editingId ? { ...p, ...entry } : p));
    } else {
      newPasswords = [...passwords, entry];
    }

    setPasswords(newPasswords);
    saveToStore(newPasswords);
    setHasUnsyncedChanges(true);

    setIsEditing(false);
    setIsModalOpen(false);

    // Auto-sync changes if enabled
    if (syncConfig.autoSync) {
      executeSync(newPasswords, syncConfig);
    }
  };

  const handleDeleteEntry = () => {
    if (!editingId) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!editingId) return;
    const deletedEntry = passwords.find((p) => p.id === editingId);
    const newPasswords = passwords.filter((p) => p.id !== editingId);

    setPasswords(newPasswords);
    saveToStore(newPasswords);
    setHasUnsyncedChanges(true);

    setIsDeleteConfirmOpen(false);
    setIsEditing(false);
    setIsModalOpen(false);

    if (syncConfig.autoSync && deletedEntry) {
      // Send tombstone payload to ensure deletion syncs with Cosmos DB
      const tombstone: PasswordEntry = {
        ...deletedEntry,
        isDeleted: true,
        updatedAt: Date.now(),
        deletedAt: Date.now(),
      };
      executeSync([...newPasswords, tombstone], syncConfig);
    }
  };

  const inputClasses = (isEditMode: boolean) =>
    `w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 outline-none transition-all text-sm ${isEditMode
      ? "focus:ring-2 focus:ring-emerald-500/50 hover:bg-neutral-900/80"
      : "cursor-copy hover:border-emerald-500/50 focus:border-emerald-500/50"
    }`;

  const renderCopyIndicator = (fieldName: string) =>
    copiedField === fieldName && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-medium flex items-center gap-1">
        <Check className="w-3 h-3" /> Copied
      </span>
    );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-neutral-800">
      {/* Titlebar / Drag region for Tauri */}
      <div
        data-tauri-drag-region
        className="h-9 w-full bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-50"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 mr-1 pointer-events-none" />
          <span className="text-xs font-semibold text-neutral-300 pointer-events-none">Password Vault</span>
          {currentUser && (
            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700">
              Vault: {syncConfig.vaultId}
            </span>
          )}
        </div>

        {/* Right side titlebar tools: User Profile + Sync Status */}
        <div className="flex items-center gap-2">
          {/* User Account Pill */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-all shadow-sm"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px]">
              {currentUser ? currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase() : <User className="w-2.5 h-2.5" />}
            </div>
            <span>{currentUser ? currentUser.displayName || currentUser.email : "Sign In / Register"}</span>
          </button>

          {/* Quick Sync Pill in Titlebar */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
            ) : syncStatus === "error" ? (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            ) : (
              <Cloud className={`w-3 h-3 ${hasUnsyncedChanges ? "text-amber-400" : "text-emerald-400"}`} />
            )}
            <span>
              {syncStatus === "syncing"
                ? "Syncing Cosmos..."
                : syncStatus === "error"
                  ? "Sync Error"
                  : hasUnsyncedChanges
                    ? "Unsynced Changes"
                    : "Cosmos DB Synced"}
            </span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-6 gap-6 relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-neutral-500 shrink-0">Profiles</span>
          {profiles.map((profile) => (
            <button key={profile.id} onClick={() => switchProfile(profile)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors shrink-0 ${profile.id === currentProfileId ? "bg-emerald-950/50 border-emerald-700 text-emerald-300" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"}`}>
              <FolderLock className="w-3.5 h-3.5" /> {profile.name}
            </button>
          ))}
          <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400 hover:text-white hover:border-neutral-500 shrink-0">
            <Plus className="w-3.5 h-3.5" /> New profile
          </button>
          {profiles.length > 1 && <button onClick={deleteCurrentProfile} className="p-1.5 text-neutral-500 hover:text-rose-400" title="Delete current profile"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                <Key className="w-8 h-8 text-neutral-400" />
                Passwords
              </h1>
              {currentUser && (
                <span className="text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <FolderLock className="w-3 h-3" />
                  {currentUser.displayName || currentUser.email}
                </span>
              )}
            </div>
            <p className="text-neutral-400 text-sm">
              {currentUser ? `Connected to Azure Cosmos DB (${syncConfig.vaultId})` : "Manage your credentials safely across devices."}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* User Account Button */}
            {!currentUser && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 border border-emerald-600/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign In / Up</span>
              </button>
            )}

            {/* Cloud Sync Primary Button */}
            <div className="relative flex items-center">
              <button
                onClick={handleManualSync}
                disabled={syncStatus === "syncing"}
                className={`flex items-center gap-2 border text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm ${syncStatus === "syncing"
                    ? "bg-sky-950/60 border-sky-800 text-sky-300"
                    : syncStatus === "error"
                      ? "bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60"
                      : hasUnsyncedChanges
                        ? "bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50"
                        : "bg-neutral-900 border-neutral-800 text-sky-400 hover:bg-neutral-800 hover:text-sky-300"
                  }`}
                title="Synchronize passwords with Azure Cloud (Send & Receive)"
              >
                {syncStatus === "syncing" ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                ) : syncStatus === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Cloud className="w-4 h-4 text-sky-400" />
                )}
                <span>{syncStatus === "syncing" ? "Syncing..." : "Cloud Sync"}</span>

                {hasUnsyncedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Pending unsynced local changes" />
                )}
              </button>

              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="p-2 border-y border-r border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-r-lg transition-colors -ml-1 text-xs"
                title="Cloud Sync Settings & Azure Configuration"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Add Password Button */}
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Password
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search apps, emails, or usernames..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-6 flex gap-3 flex-col">
          {filteredPasswords.map((item) => {
            const isVisible = visiblePasswords[item.id] || false;

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  handleOpenExisting(item);
                }}
                className="group flex flex-col p-4 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all rounded-xl shadow-sm cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700/50">
                      <Key className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-100 text-base">{item.name}</h3>
                      <p className="text-sm text-neutral-400">{item.email || item.username || "No username/email"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={(e) => toggleVisibility(item.id, e)}
                      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                      title={isVisible ? "Hide Password" : "Show Password"}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => copyToClipboard(item.password, e)}
                      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Copy Password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewEntry(item);
                        setEditingId(item.id);
                        setIsEditing(true);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Edit Password"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                  <div className="font-mono">
                    {isVisible ? item.password : "••••••••••••••••"}
                  </div>
                  {item.customFields && item.customFields.length > 0 && (
                    <span className="text-[11px] bg-neutral-800/60 px-2 py-0.5 rounded text-neutral-400">
                      {item.customFields.length} custom {item.customFields.length === 1 ? "field" : "fields"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPasswords.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
              <Key className="w-12 h-12 text-neutral-600 mb-3" />
              <h3 className="text-lg font-medium text-neutral-300 mb-1">No Passwords Found</h3>
              <p className="text-neutral-500 text-sm max-w-sm mb-4">
                {searchTerm
                  ? "No credentials match your search criteria."
                  : "You haven't added any passwords yet or synced from Azure Cosmos DB."}
              </p>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-neutral-700"
              >
                <Plus className="w-4 h-4" />
                Add First Password
              </button>
            </div>
          )}
        </div>
      </main>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-medium">New profile</h2><button onClick={() => setIsProfileModalOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button></div>
            <label className="block text-xs text-neutral-400 mb-1.5">Profile name</label>
            <input autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => e.key === "Enter" && createProfile()} placeholder="e.g. Work, Family" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50" />
            <div className="flex justify-end gap-2 mt-5"><button onClick={() => setIsProfileModalOpen(false)} className="px-3 py-2 text-sm text-neutral-400">Cancel</button><button onClick={createProfile} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg">Create profile</button></div>
          </div>
        </div>
      )}

      {/* Auth / Account Management Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        syncConfig={syncConfig}
        onUpdateVaultId={handleUpdateVaultId}
      />

      {/* Cloud Sync Settings Modal */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={syncConfig}
        onSaveConfig={handleSaveConfig}
        onTriggerSync={handleManualSync}
        status={syncStatus}
        stats={syncStats}
        errorMessage={syncErrorMessage}
      />

      {/* Add / Edit / View Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
                  <Key className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-medium text-white">
                  {isEditing ? (editingId ? "Edit Password" : "New Password") : newEntry.name || "Password Details"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* App / Website Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">App / Website Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={newEntry.name || ""}
                    onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                    placeholder="e.g. GitHub, Netflix, Google"
                    className={inputClasses(isEditing)}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={newEntry.username || ""}
                    onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                    placeholder="e.g. johndoe"
                    onClick={() => !isEditing && copyToClipboard(newEntry.username || "", undefined, "username")}
                    className={inputClasses(isEditing)}
                  />
                  {!isEditing && renderCopyIndicator("username")}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={newEntry.email || ""}
                    onChange={(e) => setNewEntry({ ...newEntry, email: e.target.value })}
                    placeholder="e.g. john@example.com"
                    onClick={() => !isEditing && copyToClipboard(newEntry.email || "", undefined, "email")}
                    className={inputClasses(isEditing)}
                  />
                  {!isEditing && renderCopyIndicator("email")}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={isEditing ? "text" : visiblePasswords["modal"] ? "text" : "password"}
                    disabled={!isEditing}
                    value={newEntry.password || ""}
                    onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                    placeholder="Enter password"
                    onClick={() => !isEditing && copyToClipboard(newEntry.password || "", undefined, "password")}
                    className={`${inputClasses(isEditing)} font-mono pr-20`}
                  />
                  {!isEditing && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => toggleVisibility("modal", e)}
                        className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                      >
                        {visiblePasswords["modal"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(newEntry.password || "", e, "password")}
                        className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                        title="Copy Password"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!isEditing && renderCopyIndicator("password")}
                </div>
              </div>

              {/* Custom Fields */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-neutral-400">Custom Fields</label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <ListPlus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {newEntry.customFields?.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={field.name}
                        onChange={(e) => handleCustomFieldChange(field.id, "name", e.target.value)}
                        placeholder="Field Name (e.g. PIN, Recovery Key)"
                        className="w-1/3 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                      <div className="relative flex-1">
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={field.value}
                          onChange={(e) => handleCustomFieldChange(field.id, "value", e.target.value)}
                          placeholder="Value"
                          onClick={() => !isEditing && copyToClipboard(field.value, undefined, field.id)}
                          className={`w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 text-xs outline-none ${!isEditing ? "cursor-copy" : ""
                            }`}
                        />
                        {!isEditing && renderCopyIndicator(field.id)}
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="p-2 text-neutral-500 hover:text-red-400 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!newEntry.customFields || newEntry.customFields.length === 0) && !isEditing && (
                    <span className="text-xs text-neutral-500 italic">No custom fields added.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
              {editingId ? (
                <button
                  onClick={handleDeleteEntry}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  {isEditing ? "Cancel" : "Close"}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSaveEntry}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Delete Password?</h3>
              <p className="text-neutral-400 text-sm">
                Are you sure you want to delete this password? This action cannot be undone and will synchronize across all devices.
              </p>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
