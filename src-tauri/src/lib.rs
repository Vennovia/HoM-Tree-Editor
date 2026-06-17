
use tauri::Manager;
use std::fs;
use std::env;
use std::path::PathBuf;

#[tauri::command]
async fn save_grimoire_to_disk(json_content: String, file_name: String) -> Result<String, String> {
    // Get the directory where the executable is located
    let exe_path = env::current_exe().map_err(|e| e.to_string())?;
    let install_dir = exe_path.parent().ok_or("Failed to get executable directory")?;
    
    // Ensure the exports folder exists
    let export_dir = install_dir.join("exports");
    fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    
    // Create the full file path
    let file_path = export_dir.join(&file_name);
    
    // Write the file
    fs::write(&file_path, json_content).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_grimoire_path() -> Result<String, String> {
    let exe_path = env::current_exe().map_err(|e| e.to_string())?;
    let install_dir = exe_path.parent().ok_or("Failed to get executable directory")?;
    let import_dir = install_dir.join("imports");
    fs::create_dir_all(&import_dir).map_err(|e| e.to_string())?;
    Ok(import_dir.to_string_lossy().to_string())
}

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

      // Pre-create folders on startup
      let exe_path = env::current_exe().expect("Failed to get current exe path");
      let install_dir = exe_path.parent().expect("Failed to get executable directory");
      fs::create_dir_all(install_dir.join("imports")).ok();
      fs::create_dir_all(install_dir.join("exports")).ok();

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![save_grimoire_to_disk, get_grimoire_path])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
