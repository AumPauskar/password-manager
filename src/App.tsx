import { useState } from "react";
import { Key, Copy, Search, Shield, Eye, EyeOff, Plus, X, ListPlus, Save, Trash2 } from "lucide-react";
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
  const [newEntry, setNewEntry] = useState<Partial<PasswordEntry>>({
    name: "",
    username: "",
    email: "",
    password: "",
    customFields: []
  });

  const filteredPasswords = passwords.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleOpenModal = () => {
    setNewEntry({
      name: "",
      username: "",
      email: "",
      password: "",
      customFields: []
    });
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

  const handleSaveEntry = () => {
    if (!newEntry.name || !newEntry.password) {
      alert("App Name and Password are required.");
      return;
    }

    const entry: PasswordEntry = {
      id: crypto.randomUUID(),
      name: newEntry.name || "",
      username: newEntry.username || "",
      email: newEntry.email || "",
      password: newEntry.password || "",
      customFields: newEntry.customFields || []
    };

    setPasswords(prev => [...prev, entry]);
    setIsModalOpen(false);
  };

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
            onClick={handleOpenModal}
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
                className="group flex flex-col p-4 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all rounded-xl shadow-sm"
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
                        className="w-full bg-transparent text-sm text-neutral-300 outline-none font-mono py-1 px-2 select-all"
                      />
                    </div>
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(item.password)}
                      title="Copy Password"
                      className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Display Custom Fields */}
                {item.customFields && item.customFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.customFields.map((field) => (
                        <div key={field.id} className="flex flex-col bg-neutral-950/30 p-2 rounded-lg border border-neutral-800/50">
                          <span className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{field.name || "Custom Field"}</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono text-neutral-300 truncate">{field.value}</span>
                            <button
                              onClick={() => copyToClipboard(field.value)}
                              className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* Add Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
              <h2 className="text-lg font-medium text-white">Add New Password</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-400">App / Website Name *</label>
                <input
                  type="text"
                  autoFocus
                  value={newEntry.name}
                  onChange={e => setNewEntry({ ...newEntry, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                  placeholder="e.g. Google, GitHub, Netflix"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-400">Username</label>
                  <input
                    type="text"
                    value={newEntry.username}
                    onChange={e => setNewEntry({ ...newEntry, username: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                    placeholder="johndoe123"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-400">Email</label>
                  <input
                    type="email"
                    value={newEntry.email}
                    onChange={e => setNewEntry({ ...newEntry, email: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-400">Password *</label>
                <input
                  type="text"
                  value={newEntry.password}
                  onChange={e => setNewEntry({ ...newEntry, password: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm select-all"
                  placeholder="SuperSecretP@ssw0rd!"
                />
              </div>

              {/* Custom Fields Section */}
              <div className="border-t border-neutral-800/50 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-300">Additional Fields</span>
                  <button
                    onClick={handleAddCustomField}
                    className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <ListPlus className="w-4 h-4" /> Add Field
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {newEntry.customFields?.map((field) => (
                    <div key={field.id} className="flex gap-2 items-start bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/50">
                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={e => handleCustomFieldChange(field.id, "name", e.target.value)}
                          className="w-full bg-transparent border-b border-neutral-800 text-white pb-1 outline-none focus:border-emerald-500/50 transition-all text-xs font-medium placeholder-neutral-600 truncate"
                          placeholder="Field Name (e.g. Recovery Code)"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => handleCustomFieldChange(field.id, "value", e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {newEntry.customFields?.length === 0 && (
                    <p className="text-xs text-neutral-600 italic">No custom fields added.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
