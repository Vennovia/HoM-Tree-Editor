# HoM Tree Editor - Standalone Setup

This application is a specialized visual editor for Heart of Magic spell structures. It is optimized for performance and can be exported as a standalone desktop application.

## Option 1: Standalone Build (Tauri) - Recommended
Tauri allows you to compile the editor into a native executable (.exe, .app, .deb) that is extremely lightweight and fast.

### Prerequisites
1.  **Rust**: You must have the Rust toolchain installed on your computer. [Install Rust here](https://www.rust-lang.org/tools/install).
2.  **OS Dependencies**:
    *   **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually installed by default).
    *   **macOS**: Xcode Command Line Tools.
    *   **Linux**: Various dev packages (libwebkit2gtk-4.0-dev, etc.).

### Build Steps
1.  Open your terminal in the project folder.
2.  Install the Tauri dependencies:
    ```bash
    npm install
    ```
3.  Run the application in desktop dev mode:
    ```bash
    npm run tauri dev
    ```
4.  Build the final production executable:
    ```bash
    npm run tauri build
    ```
    *The standalone program will be found in `src-tauri/target/release/bundle/`.*

---

## Option 2: Web App Installation (PWA)
The simplest way to use this as a standalone application without installing Rust.

### 1. Local Build
1.  Open the terminal and install dependencies:
    ```bash
    npm install
    ```
2.  Build the static application:
    ```bash
    npm run build
    ```

### 2. Run and Install
1.  Start the local server:
    ```bash
    npm run dev
    ```
2.  Open `http://localhost:3000` in a Chromium-based browser (Chrome, Edge, Brave).
3.  Click the **Install Icon** (monitor icon) on the right side of the address bar.
4.  The editor will now open in its own window.

---

## Sharing & Collaboration

### Sharing Your Grimoire Data
Since this app uses browser local storage for high performance, your specific spell data stays on your machine. To share your structures:
- Use the **"Grimoire Seal" (Export)** button in the sidebar to download your work as a `.json` file.
- Send this file to your collaborator.
- They can use the **"Import"** button in their instance of the editor to load your data.

## Saving Your Work
- **Auto-Save**: The app automatically saves your grimoire to local storage.
- **Manual Backup**: Always use the **Export** button to keep a backup of your important structures as a `.json` file.