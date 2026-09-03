# 🔐 Password Vault

A modern, cross-platform password manager built with **Tauri v2**, **React 19**, **TypeScript**, and **Vite** — with optional cloud sync via **Azure Cosmos DB**.

---

## 📚 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Local Development Setup](#-local-development-setup)
- [Environment Variables](#-environment-variables)
- [Building for Each Platform](#-building-for-each-platform)
  - [Linux](#linux)
  - [Windows](#windows)
  - [Android (Mobile)](#android-mobile)
- [Azure Cloud Sync](#-azure-cloud-sync)
- [IDE Setup](#-ide-setup)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app/) (Rust) |
| Frontend | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite 7](https://vitejs.dev/) |
| Styling | [TailwindCSS v3](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Local persistence | `@tauri-apps/plugin-store` (JSON store) |
| Cloud sync backend | Azure Functions (Node.js) + Azure Cosmos DB (NoSQL) |

---

## 📁 Project Structure

```
password-manager/
├── src/                        # React frontend source
│   ├── App.tsx                 # Root app component
│   ├── components/             # UI components (modals, etc.)
│   ├── services/               # syncService, authService
│   └── types/                  # TypeScript type definitions
├── src-tauri/                  # Tauri / Rust backend
│   ├── src/                    # Rust source (main.rs, lib.rs)
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri app config
├── azure-functions/            # Azure Function App (Node.js)
│   └── src/functions/sync.js   # Sync + Accounts handler
├── .env.local                  # ⚠️ Local secrets (not committed)
├── AZURE_SETUP.md              # Full Azure backend setup guide
└── AZURE_FUNCTIONS.md          # Azure Functions deployment guide
```

---

## 💻 Local Development Setup

### Prerequisites

Before you begin, install the following:

1. **Node.js** v18 or later — [nodejs.org](https://nodejs.org/)
2. **Rust & Cargo** — [rustup.rs](https://rustup.rs/)
3. **Platform build tools** (see [Platform Builds](#-building-for-each-platform) below)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd password-manager

# 2. Install Node dependencies
npm install

# 3. Set up environment variables (see section below)
cp .env.local.example .env.local   # then fill in your values

# 4. Start the Vite dev server (browser preview only)
npm run dev

# 5. Run the full Tauri desktop app
npm run tauri dev
```

> **Note:** The first `tauri dev` run will compile Rust dependencies via Cargo. This can take **3–10 minutes** on the first run; subsequent runs are fast.

---

## 🔑 Environment Variables

Secrets are stored in a **`.env.local`** file at the project root. This file is excluded from git via `*.local` in `.gitignore` and must **never be committed**.

Create `.env.local` with the following variables:

```env
VITE_AZURE_FUNCTION_URL=https://<your-function-app>.azurewebsites.net/api/sync
VITE_AZURE_FUNCTION_KEY=<your-azure-function-key>
```

| Variable | Description |
|---|---|
| `VITE_AZURE_FUNCTION_URL` | The full URL to your deployed Azure Function `sync` endpoint |
| `VITE_AZURE_FUNCTION_KEY` | The API key for your Azure Function (found in Azure Portal → Function → Get Function URL) |

> Variables must be prefixed with `VITE_` to be exposed to the frontend by Vite.  
> Share these values with team members out-of-band (e.g. a shared password manager or secret vault).

---

## 📦 Building for Each Platform

### Linux

#### Prerequisites

Install the required system libraries for your distro:

**Debian / Ubuntu:**
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl wget file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Arch / Manjaro:**
```bash
sudo pacman -S webkit2gtk-4.1 base-devel
```

**Fedora / RHEL:**
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel
sudo dnf group install "C Development Tools and Libraries"
```

#### Build

```bash
npm run tauri build
```

Output artifacts will be in `src-tauri/target/release/bundle/`:
- `.deb` — Debian package
- `.rpm` — RPM package (if `rpm` tools are present)
- `.AppImage` — portable executable (no install required)

---

### Windows

#### Prerequisites

1. **Visual Studio 2022** with the **"Desktop development with C++"** workload  
   *(or standalone [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/))*
2. **WebView2 Runtime** — pre-installed on Windows 10 (1803+) and Windows 11.  
   If missing, download from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
3. Rust target for Windows (usually installed by default with `rustup`):
   ```powershell
   rustup target add x86_64-pc-windows-msvc
   ```

#### Build

```powershell
npm run tauri build
```

Output artifacts in `src-tauri\target\release\bundle\`:
- `.exe` — standalone NSIS installer
- `.msi` — Windows Installer package

> **Cross-compiling** Windows binaries from Linux/macOS is not officially supported. Build on a Windows machine or use a Windows CI runner.

---

### Android (Mobile)

#### Prerequisites

1. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
   - In SDK Manager, install:
     - **Android SDK** (API level 24 or higher recommended)
     - **Android NDK** (latest stable)
     - **CMake**

2. **Java Development Kit (JDK) 17 or later**
   ```bash
   # Ubuntu/Debian
   sudo apt install openjdk-17-jdk
   ```

3. **Set environment variables** (add to `~/.bashrc` or `~/.zshrc`):
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export ANDROID_HOME=$HOME/Android/Sdk
   export NDK_HOME=$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk | tail -1)
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

4. **Add Rust Android targets:**
   ```bash
   rustup target add \
     aarch64-linux-android \
     armv7-linux-androideabi \
     i686-linux-android \
     x86_64-linux-android
   ```

5. **Initialize the Tauri Android project** (first time only):
   ```bash
   npm run tauri android init
   ```

#### Development (on a connected device or emulator)

```bash
npm run tauri android dev
```

#### Build (release APK / AAB)

```bash
npm run tauri android build
```

Output in `src-tauri/gen/android/app/build/outputs/`:
- `apk/` — APK files for direct installation
- `bundle/` — AAB (Android App Bundle) for Play Store submission

> **Signing:** For a production release, configure a keystore in `src-tauri/gen/android/app/build.gradle`. See [Tauri Android docs](https://tauri.app/distribute/sign/android/) for details.

---

## ☁️ Azure Cloud Sync

This app supports optional end-to-end cloud sync via Azure. See the dedicated guides:

- **[AZURE_SETUP.md](./AZURE_SETUP.md)** — How to provision Cosmos DB and the Function App in Azure Portal
- **[AZURE_FUNCTIONS.md](./AZURE_FUNCTIONS.md)** — How to deploy the `azure-functions/` code to your Function App

### Quick summary

| Component | Service |
|---|---|
| Sync API | Azure Functions (Node.js, Consumption plan) |
| Database | Azure Cosmos DB for NoSQL (Serverless) |
| Storage fallback | Azure Blob Storage |

The sync function handles:
- Password upsert / merge (conflict resolution by `updatedAt` timestamp)
- Soft deletes via tombstone entries (`isDeleted: true`)
- Account registration, login, and vault ID management

---

## 🧩 IDE Setup

**Recommended:** [VS Code](https://code.visualstudio.com/) with these extensions:

| Extension | Purpose |
|---|---|
| [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) | Tauri project support |
| [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Rust IntelliSense |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | TypeScript/JS linting |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | Class autocomplete |
