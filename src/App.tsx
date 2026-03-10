import { useState, useEffect } from "react";
import { Key, Copy, Search, Shield, Eye, EyeOff, Plus, X, ListPlus, Save, Trash2, Edit2, Check } from "lucide-react";
import { load } from "@tauri-apps/plugin-store";
import "./App.css";

type CustomField = {
  id: string;
  name: string;
  value: string;
};

type PasswordEntry = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  customFields: CustomField[];
};

export default function App() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

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
    customFields: []
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function initStore() {
      try {
        const store = await load("passwords.json", { autoSave: true, defaults: {} });
        const saved = await store.get<PasswordEntry[]>("passwords");
        if (saved) {
          setPasswords(saved);
        }
      } catch (err) {
        console.error("Failed to load store:", err);
      }
    }
    initStore();
  }, []);

  const filteredPasswords = passwords.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
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
      customFields: []
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
    setNewEntry(prev => ({
      ...prev,
      customFields: [
        ...(prev.customFields || []),
        { id: crypto.randomUUID(), name: "", value: "" }
      ]
    }));
  };

  const handleCustomFieldChange = (id: string, field: "name" | "value", value: string) => {
    setNewEntry(prev => ({
      ...prev,
      customFields: prev.customFields?.map(f => f.id === id ? { ...f, [field]: value } : f)
    }));
  };

  const handleRemoveCustomField = (id: string) => {
    setNewEntry(prev => ({
      ...prev,
      customFields: prev.customFields?.filter(f => f.id !== id)
    }));
  };

  const saveToStore = async (newPasswords: PasswordEntry[]) => {
    try {
      const store = await load("passwords.json", { autoSave: true, defaults: {} });
      await store.set("passwords", newPasswords);
    } catch (err) {
      console.error("Failed to save to store:", err);
    }
  };

  const handleSaveEntry = () => {
    if (!newEntry.name || !newEntry.password) {
      alert("App Name and Password are required.");
      return;
    }

    const entry: PasswordEntry = {
      id: editingId || crypto.randomUUID(),
      name: newEntry.name || "",
      username: newEntry.username || "",
      email: newEntry.email || "",
      password: newEntry.password || "",
      customFields: newEntry.customFields || []
    };

    let newPasswords;
    if (editingId) {
      newPasswords = passwords.map(p => p.id === editingId ? entry : p);
    } else {
      newPasswords = [...passwords, entry];
    }
    
    setPasswords(newPasswords);
    saveToStore(newPasswords);
    
    setIsEditing(false);
    setIsModalOpen(false);
  };

  const handleDeleteEntry = () => {
    if (!editingId) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!editingId) return;
    const newPasswords = passwords.filter(p => p.id !== editingId);
    setPasswords(newPasswords);
    saveToStore(newPasswords);
    
    setIsDeleteConfirmOpen(false);
    setIsEditing(false);
    setIsModalOpen(false);
  };

  const inputClasses = (isEditMode: boolean) => 
    `w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 outline-none transition-all text-sm ${
      isEditMode 
        ? "focus:ring-2 focus:ring-emerald-500/50 hover:bg-neutral-900/80" 
        : "cursor-copy hover:border-emerald-500/50 focus:border-emerald-500/50"
    }`;

  const renderCopyIndicator = (fieldName: string) => (
    copiedField === fieldName && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-medium flex items-center gap-1">
        <Check className="w-3 h-3" /> Copied
      </span>
    )
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-neutral-800">
      {/* Titlebar / Drag region for Tauri */}
      <div data-tauri-drag-region className="h-8 w-full bg-neutral-900 border-b border-neutral-800 flex items-center px-4 shrink-0 shadow-sm relative z-50">
        <Shield className="w-4 h-4 text-emerald-500 mr-2 pointer-events-none" />
        <span className="text-xs font-medium text-neutral-400 pointer-events-none">Password Manager</span>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-6 gap-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Key className="w-8 h-8 text-neutral-400" />
              Passwords
            </h1>
            <p className="text-neutral-400 text-sm">Manage your credentials safely.</p>
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Password
          </button>
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
                  if ((e.target as HTMLElement).closest('button')) return;
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
                      <h3 className="font-medium text-neutral-200">{item.name}</h3>
                      <p className="text-xs text-neutral-500">
                        {item.username && <span>{item.username}</span>}
                        {item.username && item.email && <span className="mx-1">•</span>}
                        {item.email && <span>{item.email}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/50 sm:border-none sm:bg-transparent px-3 sm:px-0">
                    <div className="relative flex-1 sm:w-48">
                      <input
                        type={isVisible ? "text" : "password"}
                        readOnly
                        value={item.password}
                        className="w-full bg-transparent text-sm text-neutral-300 outline-none font-mono py-1 px-2 select-all cursor-pointer"
                        title="Click item to edit / view details"
                      />
                    </div>
                    <button
                      onClick={(e) => toggleVisibility(item.id, e)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => copyToClipboard(item.password, e)}
                      title="Copy Password"
                      className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPasswords.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-neutral-800 mx-auto mb-3" />
              <p className="text-neutral-500">
                {searchTerm ? "No passwords match your search." : "Your vault is empty. Add a new password to get started."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* View/Edit Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
              <h2 className="text-lg font-medium text-white">
                {editingId ? (isEditing ? "Edit Password" : "Password Details") : "Add New Password"}
              </h2>
              <div className="flex items-center gap-2">
                {editingId && !isEditing && (
                  <>
                    <button
                      onClick={handleDeleteEntry}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5 px-3 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 px-3 text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-medium text-neutral-400">App / Website Name {isEditing && "*"}</label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus={isEditing && !editingId}
                    readOnly={!isEditing}
                    value={newEntry.name}
                    onClick={() => !isEditing && copyToClipboard(newEntry.name || "", undefined, "name")}
                    onChange={e => isEditing && setNewEntry({ ...newEntry, name: e.target.value })}
                    className={inputClasses(isEditing)}
                    placeholder="e.g. Google, GitHub, Netflix"
                  />
                  {!isEditing && renderCopyIndicator("name")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-sm font-medium text-neutral-400">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={!isEditing}
                      value={newEntry.username}
                      onClick={() => !isEditing && copyToClipboard(newEntry.username || "", undefined, "username")}
                      onChange={e => isEditing && setNewEntry({ ...newEntry, username: e.target.value })}
                      className={inputClasses(isEditing)}
                      placeholder="johndoe123"
                    />
                    {!isEditing && renderCopyIndicator("username")}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-sm font-medium text-neutral-400">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly={!isEditing}
                      value={newEntry.email}
                      onClick={() => !isEditing && copyToClipboard(newEntry.email || "", undefined, "email")}
                      onChange={e => isEditing && setNewEntry({ ...newEntry, email: e.target.value })}
                      className={inputClasses(isEditing)}
                      placeholder="john@example.com"
                    />
                    {!isEditing && renderCopyIndicator("email")}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-medium text-neutral-400">Password {isEditing && "*"}</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly={!isEditing}
                    value={newEntry.password}
                    onClick={() => !isEditing && copyToClipboard(newEntry.password || "", undefined, "password")}
                    onChange={e => isEditing && setNewEntry({ ...newEntry, password: e.target.value })}
                    className={`${inputClasses(isEditing)} font-mono`}
                    placeholder="SuperSecretP@ssw0rd!"
                  />
                  {!isEditing && renderCopyIndicator("password")}
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="border-t border-neutral-800/50 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-300">Additional Fields</span>
                  {isEditing && (
                    <button
                      onClick={handleAddCustomField}
                      className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      <ListPlus className="w-4 h-4" /> Add Field
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {newEntry.customFields?.map((field) => (
                    <div key={field.id} className="flex gap-2 items-start bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/50 relative">
                      <div className="flex-1 flex flex-col gap-2 relative">
                        <input
                          type="text"
                          readOnly={!isEditing}
                          value={field.name}
                          onClick={() => !isEditing && copyToClipboard(field.name || "", undefined, `field-${field.id}-name`)}
                          onChange={e => isEditing && handleCustomFieldChange(field.id, "name", e.target.value)}
                          className={`w-full bg-transparent border-b border-neutral-800 text-white pb-1 outline-none transition-all text-xs font-medium placeholder-neutral-600 truncate ${isEditing ? "focus:border-emerald-500/50" : "cursor-copy hover:border-emerald-500/50"}`}
                          placeholder="Field Name"
                        />
                        {!isEditing && renderCopyIndicator(`field-${field.id}-name`)}
                        
                        <div className="relative">
                          <input
                            type="text"
                            readOnly={!isEditing}
                            value={field.value}
                            onClick={() => !isEditing && copyToClipboard(field.value || "", undefined, `field-${field.id}-value`)}
                            onChange={e => isEditing && handleCustomFieldChange(field.id, "value", e.target.value)}
                            className={`w-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono rounded-md px-2 py-1.5 outline-none transition-all text-sm ${isEditing ? "focus:ring-1 focus:ring-emerald-500/50" : "cursor-copy hover:border-emerald-500/50"}`}
                            placeholder="Value"
                          />
                          {!isEditing && renderCopyIndicator(`field-${field.id}-value`)}
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {newEntry.customFields?.length === 0 && (
                    <p className="text-xs text-neutral-600 italic">No additional fields.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-between gap-3">
              {isEditing && editingId ? (
                <button
                  onClick={handleDeleteEntry}
                  className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              ) : <div></div>}
              
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
                Are you sure you want to delete this password? This action cannot be undone.
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
