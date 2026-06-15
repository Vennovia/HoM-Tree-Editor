# HoM Tree Editor - Local Setup

This is a specialized visual editor for Heart of Magic spell structures, optimized for performance and precision.

## How to "Export" as a Program

The best way to use this as a standalone application is to install it as a **PWA**:

1.  **Build Locally**: Run `npm run build` then `npm start`.
2.  **Install**: Open `http://localhost:3000` in Chrome or Edge.
3.  **Desktop App**: Click the **Install Icon** in the address bar. This creates a dedicated window and a desktop shortcut, effectively "exporting" the website into a standalone program.

## Getting Started Locally

### Prerequisites
- **Node.js**: [Download and install Node.js](https://nodejs.org/) (Recommended: v18+).
- **VS Code**: Use Visual Studio Code for the best editing experience.

### Installation
1. Create a folder and copy the project files provided.
2. Open your terminal in that folder.
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the local server for editing:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Saving Your Work
- **Local Persistence**: The app automatically saves your progress to your browser's local storage.
- **Manual Export**: Use the **"Grimoire Seal" (Export)** button in the sidebar to download a `.json` file. This is the best way to "export" your data to move it between different computers.

## Project Structure
- `src/app/page.tsx`: Main application entry and state management.
- `src/components/canvas`: Visual editors for global and school-specific views (High-performance Canvas).
- `src/components/editor`: Node-level property editors and JSON logic.
- `src/types`: TypeScript definitions for the spell tree data structure.
