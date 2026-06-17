use tauri::Manager;
use std::fs;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      // Pre-create default folders on startup relative to the executable
      if let Ok(exe_path) = env::current_exe() {
          if let Some(install_dir) = exe_path.parent() {
              let _ = fs::create_dir_all(install_dir.join("imports"));
              let _ = fs::create_dir_all(install_dir.join("exports"));
          }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
