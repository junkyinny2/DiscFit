#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_app_lib::commands;

fn main() {
    tauri::Builder::default()
        .manage(commands::tasks::TaskManager::new())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::binpacking::pack_items,
            commands::fs_ops::enumerate_path,
            commands::fs_ops::export_to_folder,
            commands::fs_ops::get_file_icon_base64,
            commands::exporters::export_to_dxp,
            commands::exporters::export_to_ibb,
            commands::exporters::export_to_text,
            commands::mkisofs::export_to_iso,
            commands::tasks::cancel_task,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::version::get_app_version,
            commands::plugins::get_plugins,
            commands::plugins::run_plugin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
