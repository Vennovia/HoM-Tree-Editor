
# HoM Editor - Standalone Setup

This application is a specialized visual editor for Heart of Magic spell structures. It is optimized for performance and can be exported as a standalone desktop application.

## 📂 Project Structure & Data Locations

### Managed Grimoire Folders (Standalone App Only)
When running as a standalone app, the editor uses dedicated folders located **in the same folder as the program itself**:

- **Location**: `[Install Directory]/exports` and `[Install Directory]/imports`
- **Usage**: Use these folders to keep your spell data organized and portable. Perfect for keeping your grimoire with the application on a USB drive.

---

## 💾 File Management (Export/Import)
**Exporting**: Clicking the "Export" button in the standalone app saves the `.json` file directly to the **exports** folder next to your app executable.
**Importing**: Use the "Import" button to select a `.json` file. The "Open From Grimoire" button specifically starts looking in your local **imports** folder.

---

## 🚀 Local Development (Frontend Only)
1.  Open your terminal in the project folder.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`
4.  Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Building the Standalone App (Tauri)
### Prerequisites
1.  **Rust**: [Install Rust here](https://www.rust-lang.org/tools/install).
2.  **OS Dependencies**:
    *   **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
    *   **macOS**: Xcode Command Line Tools.

### Build Steps
1.  `npm install`
2.  `npm run tauri build`
    *The standalone program will be found in `src-tauri/target/release/bundle/`.*

### 🤖 GitHub Automated Builds (Recommended)
Every time you push to GitHub, a build starts automatically:
1.  Go to your GitHub repository **Actions** tab.
2.  Download the latest artifacts for your OS.

---

## 🛠 Git Troubleshooting

### Error: `[rejected] (non-fast-forward)`
1. `git pull origin standalone-build`
2. `git push origin standalone-build`

### Error: `You have not concluded your merge (MERGE_HEAD exists)`
1. Run `git merge --abort`
2. Run `git pull origin standalone-build` again.
