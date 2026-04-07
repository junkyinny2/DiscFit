use crate::models::{Plugin, FileItem};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use std::process::Command;

#[tauri::command]
pub fn get_plugins(app: AppHandle) -> Vec<Plugin> {
    let mut plugins = Vec::new();
    let app_dir = app.path().app_data_dir().unwrap_or(PathBuf::from("."));
    let plugins_dir = app_dir.join("plugins");

    if !plugins_dir.exists() {
        let _ = fs::create_dir_all(&plugins_dir);
        return plugins;
    }

    if let Ok(entries) = fs::read_dir(plugins_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                if let Ok(content) = fs::read_to_string(path) {
                    if let Ok(plugin) = serde_json::from_str::<Plugin>(&content) {
                        plugins.push(plugin);
                    }
                }
            }
        }
    }
    plugins
}

#[tauri::command]
pub async fn run_plugin(
    plugin: Plugin,
    items: Vec<FileItem>,
) -> Result<(), String> {
    // Write items to a temp file for the plugin to consume
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(format!("discfit_plugin_{}.json", uuid::Uuid::new_v4()));
    let content = serde_json::to_string(&items).map_err(|e| e.to_string())?;
    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    let mut cmd = Command::new(&plugin.executable);
    if let Some(args) = plugin.args {
        cmd.args(args);
    }
    cmd.arg(file_path.to_string_lossy().to_string());

    let output = cmd.output().map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}
