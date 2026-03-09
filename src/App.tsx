import { useState } from "react";
import { Key, Github, Mail, Slack, Chrome, Twitter, Copy, Search, Shield, Eye, EyeOff } from "lucide-react";
import "./App.css";

const HARDCODED_PASSWORDS = [
  { id: 1, name: "GitHub", username: "aum_dev", password: "SuperSecretGithubPassword123!", icon: Github },
  { id: 2, name: "Google Workspace", username: "aum@company.com", password: "CompanyWorkspace##2026", icon: Chrome },
  { id: 3, name: "Gmail (Personal)", username: "aumpauskar@gmail.com", password: "MyPersonalGmail!12", icon: Mail },
  { id: 4, name: "Slack", username: "aum.pauskar", password: "SlackConnect9922!", icon: Slack },
  { id: 5, name: "Twitter / X", username: "@aum_tweets", password: "X_platform_pass_444", icon: Twitter },
];

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  const filteredPasswords = HARDCODED_PASSWORDS.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVisibility = (id: number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-neutral-800">
      {/* Titlebar / Drag region for Tauri */}
      <div data-tauri-drag-region className="h-8 w-full bg-neutral-900 border-b border-neutral-800 flex items-center px-4 shrink-0 shadow-sm relative z-50">
        <Shield className="w-4 h-4 text-emerald-500 mr-2 pointer-events-none" />
        <span className="text-xs font-medium text-neutral-400 pointer-events-none">Antigravity Vault</span>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-6 gap-6 relative">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Key className="w-8 h-8 text-neutral-400" />
            Passwords
          </h1>
          <p className="text-neutral-400 text-sm">Manage your credentials safely.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search apps or usernames..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-6 flex gap-3 flex-col">
          {filteredPasswords.map((item) => {
            const Icon = item.icon;
            const isVisible = visiblePasswords[item.id] || false;
            
            return (
              <div 
                key={item.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700/50">
                    <Icon className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-200">{item.name}</h3>
                    <p className="text-xs text-neutral-500">{item.username}</p>
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
                    className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPasswords.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-neutral-800 mx-auto mb-3" />
              <p className="text-neutral-500">No passwords found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
