# HoM Editor - Standalone Setup

This application is a specialized visual editor for Heart of Magic spell structures. It is optimized for performance and can be exported as a standalone desktop application.

## 📂 Project Structure & Assets

### Web Assets
- **Location**: `public/`
- **Contents**: Static assets like `manifest.json`, logos, and images.
- **Custom Icon**: To use the "HoM Editor" icon, save your provided image as `public/icon.png`.

### Desktop Icons (Tauri)
- **Location**: `src-tauri/icons/`
- **Contents**: Native icon formats (`.ico`, `.icns`, `.png`) required for the standalone app installer and taskbar.

### Spell Image Data
- **Location**: `src/app/lib/placeholder-images.json`
- **Usage**: Centralized registry for all image URLs and hints used within the spell nodes.

---

## 💾 File Management (Export/Import)
- **Exporting**: When you click the "Export" button in the standalone app, the `.json` file is saved to your system's default **Downloads** folder.
- **Importing**: Use the "Import" button to select a previously exported `.json` file from any folder on your computer to load that specific grimoire structure.

---

## 🚀 Local Development (Frontend Only)
If you just want to run the editor in your browser:
1.  Open your terminal in the project folder.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`
4.  Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Option 1: Standalone Build (Tauri)
Tauri allows you to compile the editor into a native executable (.exe, .app, .deb) that is extremely lightweight and fast.

### Prerequisites
1.  **Rust**: You must have the Rust toolchain installed. [Install Rust here](https://www.rust-lang.org/tools/install).
2.  **OS Dependencies**:
    *   **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
    *   **macOS**: Xcode Command Line Tools.

### Build Steps
1.  `npm install`
2.  `npm run tauri build`
    *The standalone program will be found in `src-tauri/target/release/bundle/`.*

### 🤖 GitHub Automated Builds (Recommended)
You don't need to build locally! Every time you push to GitHub, a build starts automatically:
1.  Go to your GitHub repository.
2.  Click the **"Actions"** tab.
3.  Select the latest workflow run.
4.  Scroll down to **"Artifacts"** to download your `.exe` or `.dmg`.
5.  Alternatively, check the **"Releases"** section on the right sidebar for draft versions.

---

## 🌐 Option 2: Web App Installation (PWA)
The simplest way to use this as a standalone application without installing Rust.

1.  Start the local server (`npm run dev`).
2.  Open `http://localhost:3000` in a Chromium browser.
3.  Click the **Install Icon** in the address bar.
