use tauri::Manager;
use std::fs;
use std::env;
use std::path::PathBuf;

#[tauri::command]
async fn get_install_dir_path() -> Result<String, String> {
    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            return Ok(parent.to_string_lossy().to_string());
        }
    }
    Err("Could not determine installation directory".to_string())
}

#[tauri::command]
async fn save_grimoire_to_disk(content: String, file_name: String, custom_path: Option<String>) -> Result<String, String> {
    let mut target_dir = if let Some(path) = custom_path {
        if path.is_empty() {
            let exe_path = env::current_exe().map_err(|e| e.to_string())?;
            let parent = exe_path.parent().ok_or("No parent dir")?;
            parent.join("exports")
        } else {
            PathBuf::from(path)
        }
    } else {
        let exe_path = env::current_exe().map_err(|e| e.to_string())?;
        let parent = exe_path.parent().ok_or("No parent dir")?;
        parent.join("exports")
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let file_path = target_dir.join(file_name);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

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
    .invoke_handler(tauri::generate_handler![save_grimoire_to_disk, get_install_dir_path])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}