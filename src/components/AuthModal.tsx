import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Key,
  Mail,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  FolderLock,
  Sparkles,
} from "lucide-react";
import { AccountItem, CloudSyncConfig } from "../types/sync";
import { registerAccount, loginAccount, updateAccountDetails } from "../services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AccountItem | null;
  onUserChanged: (user: AccountItem | null) => void;
  syncConfig: CloudSyncConfig;
  onUpdateVaultId: (vaultId: string) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  syncConfig,
  onUpdateVaultId,
}: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup" | "profile">("signin");

  // Form State
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setTab("profile");
      setDisplayName(currentUser.displayName);
      setEmail(currentUser.email);
    } else {
      setTab("signin");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please provide your email and master password.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await loginAccount(email, password, syncConfig);
    setLoading(false);

    if (res.success && res.account) {
      onUserChanged(res.account);
      if (res.account.vaults?.length > 0) {
        onUpdateVaultId(res.account.vaults[0].vaultId);
      }
      setSuccessMsg("Signed in successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMsg(res.error || "Sign in failed.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in email and master password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Master password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await registerAccount(displayName, email, password, syncConfig);
    setLoading(false);

    if (res.success && res.account) {
      onUserChanged(res.account);
      if (res.account.vaults?.length > 0) {
        onUpdateVaultId(res.account.vaults[0].vaultId);
      }
      setSuccessMsg("Account created and registered successfully!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || "Account creation failed.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await updateAccountDetails(
      currentUser,
      { displayName, newPassword },
      syncConfig
    );
    setLoading(false);

    if (res.success && res.account) {
      onUserChanged(res.account);
      setSuccessMsg("Account details & master password updated!");
      setNewPassword("");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || "Failed to update account.");
    }
  };

  const handleLogout = () => {
    onUserChanged(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                {currentUser ? "User Account & Security" : "User Authentication"}
              </h2>
              <p className="text-xs text-neutral-400">
                {currentUser ? currentUser.email : "Azure Cosmos DB Cloud Account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher when not logged in */}
        {!currentUser && (
          <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-2">
            <button
              onClick={() => {
                setTab("signin");
                setErrorMsg(null);
              }}
              className={`pb-2.5 px-4 text-xs font-medium border-b-2 transition-all ${
                tab === "signin"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setErrorMsg(null);
              }}
              className={`pb-2.5 px-4 text-xs font-medium border-b-2 transition-all ${
                tab === "signup"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Alerts */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN TAB */}
          {tab === "signin" && !currentUser && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Master Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-10 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {loading ? "Authenticating..." : "Sign In to Vault"}
                </button>
              </div>
            </form>
          )}

          {/* SIGN UP TAB */}
          {tab === "signup" && !currentUser && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Master Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? "Creating Account..." : "Create Account & Personal Vault"}
                </button>
              </div>
            </form>
          )}

          {/* PROFILE & PASSWORD UPDATE (WHEN SIGNED IN) */}
          {currentUser && (
            <div className="space-y-4">
              {/* User overview card */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm">
                    {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-100">{currentUser.displayName}</h3>
                    <p className="text-[11px] text-neutral-400">{currentUser.email}</p>
                    <span className="inline-block mt-0.5 text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-900/50">
                      ID: {currentUser.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              {/* Vaults section */}
              {currentUser.vaults?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
                    Accessible Vaults
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {currentUser.vaults.map((v) => (
                      <div
                        key={v.vaultId}
                        onClick={() => onUpdateVaultId(v.vaultId)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          syncConfig.vaultId === v.vaultId
                            ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                            : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div>
                          <span className="font-medium">{v.name}</span>
                          <span className="text-[10px] text-neutral-500 ml-2">({v.vaultId})</span>
                        </div>
                        {syncConfig.vaultId === v.vaultId && (
                          <span className="text-[10px] bg-emerald-500 text-neutral-950 font-semibold px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Master Password Form */}
              <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2 border-t border-neutral-800">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" /> Update Account & Master Password
                </h4>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">New Master Password (optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium rounded-xl text-xs transition-colors"
                >
                  {loading ? "Saving Changes..." : "Save Account Updates"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
