# HoM Tree Editor - Standalone Setup

This application is a specialized visual editor for Heart of Magic spell structures. It is optimized for performance and can be exported as a standalone desktop application.

## 📂 Project Structure & Assets

### Web Assets
- **Location**: `public/`
- **Contents**: Static assets like `manifest.json`, logos, and images served by the Next.js frontend.
- **Reference**: Use absolute paths like `/my-image.png` in your code.

### Desktop Icons (Tauri)
- **Location**: `src-tauri/icons/`
- **Contents**: Native icon formats (`.ico`, `.icns`, `.png`) required for the standalone app installer and taskbar.

### Spell Image Data
- **Location**: `src/app/lib/placeholder-images.json`
- **Usage**: Centralized registry for all image URLs and hints used within the spell nodes.

---

## 🚀 Local Development (Frontend Only)
If you just want to run the editor in your browser:
1.  Open your terminal in the project folder.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Option 1: Standalone Build (Tauri) - Recommended
Tauri allows you to compile the editor into a native executable (.exe, .app, .deb) that is extremely lightweight and fast.

### Prerequisites
1.  **Rust**: You must have the Rust toolchain installed on your computer. [Install Rust here](https://www.rust-lang.org/tools/install).
2.  **OS Dependencies**:
    *   **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually installed by default).
    *   **macOS**: Xcode Command Line Tools.
    *   **Linux**: Various dev packages (libwebkit2gtk-4.0-dev, etc.).

### Build Steps
1.  Install the Tauri dependencies:
    ```bash
    npm install
    ```
2.  Run the application in desktop dev mode:
    ```bash
    npm run tauri dev
    ```
3.  Build the final production executable:
    ```bash
    npm run tauri build
    ```
    *The standalone program will be found in `src-tauri/target/release/bundle/`.*

---

## 🌐 Option 2: Web App Installation (PWA)
The simplest way to use this as a standalone application without installing Rust.

1.  Start the local server (`npm run dev`).
2.  Open `http://localhost:3000` in a Chromium-based browser (Chrome, Edge, Brave).
3.  Click the **Install Icon** (monitor icon) on the right side of the address bar.
4.  The editor will now open in its own window.

---

## 📜 Sharing & Collaboration
Since this app uses browser local storage, your specific spell data stays on your machine. To share your structures:
- Use the **"Export"** button in the sidebar to download your work as a `.json` file.
- Your collaborator can then use the **"Import"** button to load your data.
