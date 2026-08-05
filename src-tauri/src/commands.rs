use crate::db::{self, DbError, LogEntry, LogsResponse, CreateLogInput, UpdateLogInput, Settings};

#[tauri::command]
pub async fn create_log(input: CreateLogInput) -> Result<LogEntry, DbError> {
    let settings = db::get_settings()?;
    db::create_log(input, settings.default_rating)
}

#[tauri::command]
pub async fn list_logs() -> Result<LogsResponse, DbError> {
    db::list_logs()
}

#[tauri::command]
pub async fn update_log(id: u64, input: UpdateLogInput) -> Result<LogEntry, DbError> {
    db::update_log(id, input)
}

#[tauri::command]
pub async fn delete_log(id: u64) -> Result<(), DbError> {
    db::delete_log(id)
}

#[tauri::command]
pub async fn get_settings() -> Result<Settings, DbError> {
    db::get_settings()
}

#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<Settings, DbError> {
    db::save_settings(settings)
}

#[tauri::command]
pub async fn export_logs() -> Result<String, DbError> {
    db::export_logs()
}

#[tauri::command]
pub async fn import_logs(json: String) -> Result<u64, DbError> {
    db::import_logs(&json)
}
