# Heart of Magic Tree Editor

This is fully Coded by AI in FireBase Stuido - The idea was mine and something I wanted, but did not have the time or know how to make it myself if you want to fork it go for it.

The Heart of Magic (HoM) Tree Editor is a specialized visual development tool designed for creating and managing complex spell structures. It allows users to design radial skill trees, manage prerequisites (hard and soft), and export structured grimoires for use in magic systems.

## Key Features
- **Visual Node Editing**: Drag and drop spells in a radial or grid layout with coordinate snapping.
- **Arcane Connections**: Manage hierarchical relationships with support for hard and soft prerequisites.
- **Grimoire Management**: Seamlessly import and export spell data in a standardized JSON format.
- **Responsive Canvas**: Pan, zoom, and multi-select tools optimized for massive magical datasets.

## Building the Standalone Application (Tauri)

The editor can be compiled as a native desktop application for Windows, macOS, or Linux using [Tauri](https://tauri.app/).

### Prerequisites

1.  **Rust**: [Install the Rust toolchain](https://www.rust-lang.org/tools/install).
2.  **Node.js**: [Install Node.js (LTS recommended)](https://nodejs.org/).
3.  **OS Dependencies**:
    *   **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) and C++ Build Tools.
    *   **macOS**: Xcode Command Line Tools.
    *   **Linux (Ubuntu/Debian)**: 
        ```bash
        sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
        ```

### Build Steps

1.  **Install Dependencies**:
    Open your terminal in the project root and run:
    ```bash
    npm install
    ```

2.  **Build the Standalone App**:
    Generate the production-ready executable:
    ```bash
    npm run tauri build
    ```
    *The standalone program will be found in `src-tauri/target/release/bundle/`.*

### Local Development
To run the editor with hot-reloading in a desktop window:
```bash
npm run tauri dev
```
