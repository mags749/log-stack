mod commands;
mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Could not resolve app data directory");

            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("logger.redb");
            db::init(db_path.to_str().expect("Invalid DB path"))
                .expect("Failed to initialize database");

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_log,
            commands::list_logs,
            commands::update_log,
            commands::delete_log,
            commands::get_settings,
            commands::save_settings,
            commands::export_logs,
            commands::import_logs,
            commands::factory_reset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
