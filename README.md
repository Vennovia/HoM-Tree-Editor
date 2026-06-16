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

## Updating Your Program
When you make changes to the code and rebuild the app:
- **In Development**: The app will hot-reload automatically.
- **In Standalone/Installed Mode**: Viewers will not be forced to reload. The browser downloads the update in the background. To see changes immediately, the user should close and reopen the app or press `Ctrl + R` (or `Cmd + R`) inside the program window.

## Sharing & Collaboration

### Giving Others Workspace Access
To give another person access to this specific Firebase Studio workspace:
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select this project.
3.  Navigate to **Project Settings** (gear icon) > **Users and Permissions**.
4.  Click **Add Member**.
5.  Enter their email address.
6.  Assign the **Editor** role (or a specific role that includes Google Cloud Workstation permissions).
7.  Once added, they can log into Firebase Studio and open this project to collaborate on the code.

### Sharing Your Grimoire Data
Since this app uses browser local storage for high performance, your specific spell data stays on your machine by default. To share your structures:
- Use the **"Grimoire Seal" (Export)** button in the sidebar to download your work as a `.json` file.
- Send this file to your collaborator.
- They can use the **"Import"** button in their instance of the editor to load your data.

## Saving Your Work
- **Auto-Save**: The app automatically saves your grimoire to your browser's local storage. Even if you close the window, your work will be there when you return.
- **Manual Backup**: Use the **"Grimoire Seal" (Export)** button in the sidebar to download a `.json` file. This is the best way to move your data between different computers.

## Project Structure
- `src/app/page.tsx`: Main application entry and state management.
- `src/components/canvas`: Visual editors for global and school-specific views (High-performance Canvas).
- `src/components/editor`: Node-level property editors and logic.
- `src/types`: TypeScript definitions for the spell tree data structure.
