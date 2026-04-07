use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppSettings {
    pub dark_mode: bool,
    pub media_size: u64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            dark_mode: true,
            media_size: 737280000, // 700MB CD default
        }
    }
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> AppSettings {
    let config_dir = app.path().app_config_dir().unwrap();
    let settings_path = config_dir.join("settings.json");

    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(settings_path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    let settings_path = config_dir.join("settings.json");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_path, content).map_err(|e| e.to_string())?;
    Ok(())
}
