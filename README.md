# HoM Tree Editor - Local Setup

This is a specialized visual editor for Heart of Magic spell structures.

## Getting Started Locally

### Prerequisites
- **Node.js**: [Download and install Node.js](https://nodejs.org/) (Recommended: v18+).
- **VS Code**: Use Visual Studio Code for the best editing experience.

### Installation
1. Download or copy the project files into a folder.
2. Open your terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building as a Desktop App (PWA)
1. Build the production version:
   ```bash
   npm run build
   ```
2. Run the production server:
   ```bash
   npm start
   ```
3. Open the app in Chrome or Edge and click the **Install icon** in the address bar to save it as a standalone program.

## Project Structure
- `src/app/page.tsx`: Main application entry and state management.
- `src/components/canvas`: Visual editors for global and school-specific views.
- `src/components/editor`: Node-level property editors and JSON import logic.
- `src/types`: TypeScript definitions for the spell tree data structure.
