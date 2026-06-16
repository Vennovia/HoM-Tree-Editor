
use tauri::Manager;
use std::fs;
use std::env;

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

      // Get the directory where the executable is located
      let exe_path = env::current_exe().expect("Failed to get current exe path");
      let install_dir = exe_path.parent().expect("Failed to get executable directory");
      
      // Create dedicated subfolders beside the executable
      let import_dir = install_dir.join("imports");
      let export_dir = install_dir.join("exports");

      fs::create_dir_all(&import_dir).ok();
      fs::create_dir_all(&export_dir).ok();

      println!("Grimoire data folders initialized at installation path: {:?}", install_dir);

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
