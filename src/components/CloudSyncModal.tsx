import { useState } from "react";
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  Shield,
  Server,
  Zap,
  Database,
  X,
  Eye,
  EyeOff,
  Radio,
  Sparkles,
} from "lucide-react";
import { CloudSyncConfig, SyncStats, SyncStatus } from "../types/sync";
import { simulateRemoteAzureUpdate, resetSimulatedAzureVault } from "../services/syncService";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CloudSyncConfig;
  onSaveConfig: (newConfig: CloudSyncConfig) => void;
  onTriggerSync: () => Promise<void>;
  status: SyncStatus;
  stats: SyncStats;
  errorMessage?: string;
  onSimulateIncomingRemoteUpdate?: () => void;
}

export default function CloudSyncModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTriggerSync,
  status,
  stats,
  errorMessage,
  onSimulateIncomingRemoteUpdate,
}: CloudSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "guide">("dashboard");

  // Editable Form State
  const [provider, setProvider] = useState(config.provider);
  const [azureUrl, setAzureUrl] = useState(config.azureFunctionUrl);
  const [azureKey, setAzureKey] = useState(config.azureFunctionKey);
  const [vaultId, setVaultId] = useState(config.vaultId || "default");
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [showKey, setShowKey] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    onSaveConfig({
      ...config,
      provider,
      azureFunctionUrl: azureUrl.trim(),
      azureFunctionKey: azureKey.trim(),
      vaultId: vaultId.trim() || "default",
      autoSync,
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleSimulateRemoteEdit = () => {
    const newItem = simulateRemoteAzureUpdate();
    setSimulatedNotice(`Added "${newItem.name}" to remote Azure cloud vault! Click "Sync Now" to download.`);
    if (onSimulateIncomingRemoteUpdate) {
      onSimulateIncomingRemoteUpdate();
    }
    setTimeout(() => setSimulatedNotice(null), 5000);
  };

  const handleResetSandbox = () => {
    resetSimulatedAzureVault();
    setSimulatedNotice("Simulated Azure Cloud Vault reset to initial state.");
    setTimeout(() => setSimulatedNotice(null), 3000);
  };

  const formatLastSynced = (timestamp: number | null) => {
    if (!timestamp) return "Never synced";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
      " (" + date.toLocaleDateString() + ")";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Azure Cloud Sync
                <span className="text-[10px] font-mono uppercase bg-sky-950 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded-full">
                  {config.provider === "azure" ? "Azure Function" : "Simulated Sandbox"}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Bi-directional cloud synchronization for your vault</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "dashboard"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Dashboard
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "settings"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Azure Config
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "guide"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Azure Setup Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  status === "syncing"
                    ? "bg-sky-950/30 border-sky-800/50 text-sky-300"
                    : status === "success"
                    ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                    : status === "error"
                    ? "bg-rose-950/30 border-rose-800/50 text-rose-300"
                    : "bg-neutral-950/50 border-neutral-800 text-neutral-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {status === "syncing" && <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />}
                  {status === "success" && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                  {status === "error" && <AlertCircle className="w-6 h-6 text-rose-400" />}
                  {status === "idle" && <Cloud className="w-6 h-6 text-sky-400" />}

                  <div>
                    <h4 className="font-semibold text-sm">
                      {status === "syncing" && "Synchronizing with Cloud..."}
                      {status === "success" && "Vault Synchronized"}
                      {status === "error" && "Sync Failure"}
                      {status === "idle" && "Cloud Sync Ready"}
                    </h4>
                    <p className="text-xs opacity-80">
                      {status === "syncing" && "Exchanging and merging local & remote passwords"}
                      {status === "success" && `Last synced: ${formatLastSynced(stats.lastSyncedAt)}`}
                      {status === "error" && (errorMessage || "Could not reach Azure endpoint")}
                      {status === "idle" && `Last synced: ${formatLastSynced(stats.lastSyncedAt)}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onTriggerSync}
                  disabled={status === "syncing"}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
                  {status === "syncing" ? "Syncing..." : "Sync Now"}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">Sent to Cloud</span>
                  <span className="text-xl font-semibold text-white">{stats.sentCount}</span>
                </div>
                <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">Received from Cloud</span>
                  <span className="text-xl font-semibold text-white">{stats.receivedCount}</span>
                </div>
                <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">Total Passwords</span>
                  <span className="text-xl font-semibold text-sky-400">{stats.totalCount}</span>
                </div>
              </div>

              {/* Simulation Testing Sandbox Controls */}
              {config.provider === "simulated" && (
                <div className="mt-2 p-4 bg-sky-950/20 border border-sky-900/40 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-300 font-medium text-xs">
                      <Sparkles className="w-4 h-4 text-sky-400" /> Simulated Azure Sandbox Testing
                    </div>
                    <button
                      onClick={handleResetSandbox}
                      className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors"
                    >
                      Reset Sandbox
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Use this tool to simulate another device modifying or adding a password in your Azure Cloud Sandbox.
                  </p>

                  <button
                    onClick={handleSimulateRemoteEdit}
                    className="self-start flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-sky-300 text-xs px-3 py-1.5 rounded-lg border border-neutral-700 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5" /> Simulate Remote Device Edit
                  </button>

                  {simulatedNotice && (
                    <div className="text-xs bg-sky-900/40 text-sky-200 border border-sky-700/50 p-2.5 rounded-lg">
                      {simulatedNotice}
                    </div>
                  )}
                </div>
              )}

              {/* Azure Function Quick Status */}
              {config.provider === "azure" && (
                <div className="mt-1 p-3.5 bg-neutral-950/50 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span>Target Azure Endpoint:</span>
                    <span className="font-mono text-neutral-400 truncate max-w-[240px]">
                      {config.azureFunctionUrl || "Not configured"}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="text-sky-400 hover:underline text-[11px]"
                  >
                    Configure
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex flex-col gap-4 text-xs">
              {/* Provider Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-neutral-300 font-medium text-xs">Cloud Provider Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProvider("azure")}
                    className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                      provider === "azure"
                        ? "bg-sky-950/40 border-sky-500/80 text-white"
                        : "bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-sky-400 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5" /> Azure Functions
                      </span>
                      {provider === "azure" && <Radio className="w-3 h-3 text-sky-400" />}
                    </div>
                    <span className="text-[11px] opacity-80">Connect to your deployed Azure Serverless Function</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvider("simulated")}
                    className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                      provider === "simulated"
                        ? "bg-sky-950/40 border-sky-500/80 text-white"
                        : "bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-sky-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Simulated Sandbox
                      </span>
                      {provider === "simulated" && <Radio className="w-3 h-3 text-sky-400" />}
                    </div>
                    <span className="text-[11px] opacity-80">Offline sandbox mode for testing cloud sync</span>
                  </button>
                </div>
              </div>

              {provider === "azure" && (
                <>
                  {/* Azure Function URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-neutral-300 font-medium">Azure Function Endpoint URL *</label>
                    <input
                      type="url"
                      value={azureUrl}
                      onChange={(e) => setAzureUrl(e.target.value)}
                      placeholder="https://your-function-app.azurewebsites.net/api/sync"
                      className="bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-all font-mono text-xs"
                    />
                    <span className="text-[11px] text-neutral-500">
                      The HTTP Trigger URL of your Azure Function endpoint.
                    </span>
                  </div>

                  {/* Azure Function Key */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-neutral-300 font-medium">Azure Function Key (x-functions-key)</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={azureKey}
                        onChange={(e) => setAzureKey(e.target.value)}
                        placeholder="Function key or host key"
                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 pr-9 outline-none focus:border-sky-500 transition-all font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Vault Identifier */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-neutral-300 font-medium">Vault Identifier</label>
                    <input
                      type="text"
                      value={vaultId}
                      onChange={(e) => setVaultId(e.target.value)}
                      placeholder="default"
                      className="bg-neutral-950 border border-neutral-800 text-white rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-all text-xs"
                    />
                  </div>
                </>
              )}

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 mt-1">
                <div>
                  <h4 className="text-neutral-200 font-medium text-xs">Auto-Sync on Startup</h4>
                  <p className="text-[11px] text-neutral-400">Automatically sync with Azure when app launches</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Save Configuration Button */}
              <div className="flex items-center justify-between pt-2">
                {saveFeedback && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Settings Saved!
                  </span>
                )}
                {!saveFeedback && <span />}

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === "guide" && (
            <div className="flex flex-col gap-3 text-xs text-neutral-300">
              <div className="p-3 bg-sky-950/30 border border-sky-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sky-300 text-xs">Azure Function Setup Guide</h4>
                  <p className="text-[11px] text-neutral-400">Deploy your own free Azure serverless sync backend</p>
                </div>
                <span className="text-[11px] font-mono bg-neutral-900 border border-neutral-800 text-sky-400 px-2 py-1 rounded-md">
                  AZURE_SETUP.md
                </span>
              </div>

              <div className="flex flex-col gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <h5 className="font-medium text-white flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">1</span>
                  Create Azure Function App
                </h5>
                <p className="text-[11px] text-neutral-400 pl-5">
                  Create a Node.js (Linux, Consumption plan) Azure Function App in your Azure Portal.
                </p>
              </div>

              <div className="flex flex-col gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <h5 className="font-medium text-white flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">2</span>
                  Deploy `sync` HTTP Function
                </h5>
                <p className="text-[11px] text-neutral-400 pl-5">
                  Use the ready-made Azure Function snippet in <code className="text-sky-300">AZURE_SETUP.md</code> to store your vault in Azure Blob Storage.
                </p>
              </div>

              <div className="flex flex-col gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <h5 className="font-medium text-white flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">3</span>
                  Configure CORS in Azure Portal
                </h5>
                <p className="text-[11px] text-neutral-400 pl-5">
                  Add <code className="text-sky-300">*</code> or <code className="text-sky-300">tauri://localhost</code> to your Azure Function CORS allowed origins.
                </p>
              </div>

              <div className="flex flex-col gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <h5 className="font-medium text-white flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">4</span>
                  Paste Endpoint & Key in App Config
                </h5>
                <p className="text-[11px] text-neutral-400 pl-5">
                  Copy your Azure Function URL and Function Key into the <strong>Azure Config</strong> tab in this app.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex justify-between items-center text-xs">
          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> Timestamp Conflict Resolution Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-neutral-400 hover:text-white transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
