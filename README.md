# Password Manager (Tauri + React + TypeScript)

This is a modern, minimal Password Manager application built leveraging the following stack:
- **[Tauri](https://tauri.app/)**: Framework for building tiny, blazing fast binaries for all major desktop platforms.
- **[React](https://react.dev/) & [Vite](https://vitejs.dev/)**: For lightning-fast frontend UI rendering and development.
- **[TailwindCSS](https://tailwindcss.com/)**: For beautiful, scalable, and atomic inline styling.
- **[Lucide React](https://lucide.dev/)**: For clean, modern SVG iconography.

## 🚀 Installation & Setup

### Prerequisites

You need a few things set up before starting:
1. **Node.js** (v18.x or later) and **npm** (or yarn/pnpm).
2. **Rust** and **Cargo**. Follow the instructions on the [official Rust installation page](https://www.rust-lang.org/tools/install).
3. **OS-Specific Build Tools**: As Tauri builds native apps, you must have platform-specific C++ build tools installed.
   - **Windows**: Install the "C++ build tools" or "Desktop development with C++" workload via Visual Studio Installer.
   - **macOS**: Install Xcode Command Line Tools (`xcode-select --install`).
   - **Linux**: Install standard build-essential tools (`sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`).

### Local Setup

To quickly get the application up and running locally, follow these steps:

1. **Clone the project & Navigate into it**
   ```bash
   # assuming you have the source files
   cd password-manager
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   To test the web-app interface rapidly on your local browser (port 1420 by default):
   ```bash
   npm run dev
   ```

4. **Run the Tauri Desktop App**
   To build and start the application in its native desktop window wrappers:
   ```bash
   npm run tauri dev
   ```
   > Note: The first time you run this command, Cargo will download and compile all Rust dependencies. This could take a few minutes.

## 📦 Building the App

### Windows
**Prerequisites:**
- Visual Studio 2022 C++ Build Tools (or the "Desktop development with C++" workload in Visual Studio Installer).
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 11).

**Build Command:**
```bash
npm run tauri build
```
This command will create an executable (`.exe`) and MSI installer in the `src-tauri/target/release/bundle/` directory.

### Android
**Prerequisites:**
- **Android Studio**: Install the Android SDK, NDK, and CMake via the SDK Manager.
- **Java Development Kit (JDK)**: JDK 17 or later.
- **Set Environment Variables**: Ensure `ANDROID_HOME` and `NDK_HOME` are set in your environment variables.
- **Rust Android Targets**: Add the necessary Rust targets by running:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

**Build Command:**
```bash
npm run tauri android build
```
This command will compile and build an APK (and App Bundle).

## 🛠 Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
