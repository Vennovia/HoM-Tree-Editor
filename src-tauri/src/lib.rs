
use tauri::Manager;
use std::fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Automatically create the app data directory if it doesn't exist
      let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
      fs::create_dir_all(&app_data_dir).ok();
      
      // Create dedicated subfolders for data management
      let import_dir = app_data_dir.join("imports");
      let export_dir = app_data_dir.join("exports");

      fs::create_dir_all(&import_dir).ok();
      fs::create_dir_all(&export_dir).ok();

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
