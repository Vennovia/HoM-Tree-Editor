# HoM Tree Editor - Standalone Setup

This application is a specialized visual editor for Heart of Magic spell structures. It is optimized for performance and can be exported as a standalone desktop application.

## How to "Export" as a Program

The most reliable way to use this as a standalone application is to install it as a **Progressive Web App (PWA)**. This creates a dedicated window and desktop shortcut, effectively turning the web code into a local program.

### 1. Local Build (VS Code)
1.  Open the project folder in VS Code.
2.  Open the terminal and install dependencies:
    ```bash
    npm install
    ```
3.  Build the static application:
    ```bash
    npm run build
    ```
    *This generates an `out` folder containing your standalone program files.*

### 2. Run and Install
1.  Start the local server:
    ```bash
    npm run dev
    ```
2.  Open `http://localhost:3000` in a Chromium-based browser (Chrome, Edge, Brave).
3.  Click the **Install Icon** (monitor icon) on the right side of the address bar.
4.  The editor will now open in its own window. You can now pin it to your Taskbar or Start Menu.

## Saving Your Work
- **Auto-Save**: The app automatically saves your grimoire to your browser's local storage. Even if you close the window, your work will be there when you return.
- **Manual Backup**: Use the **"Grimoire Seal" (Export)** button in the sidebar to download a `.json` file. This is the best way to move your data between different computers.

## Project Structure
- `src/app/page.tsx`: Main application entry and state management.
- `src/components/canvas`: Visual editors for global and school-specific views (High-performance Canvas).
- `src/components/editor`: Node-level property editors and logic.
- `src/types`: TypeScript definitions for the spell tree data structure.
