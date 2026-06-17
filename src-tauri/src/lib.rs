
use tauri::Manager;
use std::fs;
use std::env;
use std::path::PathBuf;

#[tauri::command]
async fn save_grimoire_to_disk(json_content: String, file_name: String, custom_path: Option<String>) -> Result<String, String> {
    let base_dir = if let Some(ref path) = custom_path {
        if path.is_empty() {
            let exe_path = env::current_exe().map_err(|e| e.to_string())?;
            exe_path.parent().ok_or("Failed to get executable directory")?.join("exports")
        } else {
            PathBuf::from(path)
        }
    } else {
        let exe_path = env::current_exe().map_err(|e| e.to_string())?;
        exe_path.parent().ok_or("Failed to get executable directory")?.join("exports")
    };
    
    // Ensure the target folder exists
    fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;
    
    // Create the full file path
    let file_path = base_dir.join(&file_name);
    
    // Write the file
    fs::write(&file_path, json_content).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_grimoire_path(custom_path: Option<String>) -> Result<String, String> {
    if let Some(ref path) = custom_path {
        if !path.is_empty() {
             return Ok(path.clone());
        }
    }
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

      // Pre-create default folders on startup if they don't exist
      if let Ok(exe_path) = env::current_exe() {
          if let Some(install_dir) = exe_path.parent() {
              fs::create_dir_all(install_dir.join("imports")).ok();
              fs::create_dir_all(install_dir.join("exports")).ok();
          }
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![save_grimoire_to_disk, get_grimoire_path])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
