use chrono::{DateTime, Utc};
use once_cell::sync::OnceCell;
use redb::{Database, Error, ReadableTable, TableDefinition};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// ── Table definitions ─────────────────────────────────────────────────────────
// Key: log id (u64), Value: JSON string of LogEntry
const LOGS_TABLE: TableDefinition<u64, &str> = TableDefinition::new("logs");

// Key: "settings", Value: JSON string of Settings
const SETTINGS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("settings");

// ── Global DB instance ────────────────────────────────────────────────────────
static DB: OnceCell<Database> = OnceCell::new();

// ── Error type ────────────────────────────────────────────────────────────────
#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Redb(#[from] redb::Error),
    #[error("Transaction error: {0}")]
    Transaction(#[from] redb::TransactionError),
    #[error("Table error: {0}")]
    Table(#[from] redb::TableError),
    #[error("Storage error: {0}")]
    Storage(#[from] redb::StorageError),
    #[error("Commit error: {0}")]
    Commit(#[from] redb::CommitError),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("DB not initialized")]
    NotInitialized,
}

impl serde::Serialize for DbError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ── Domain models ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogReference {
    #[serde(rename = "type")]
    pub ref_type: String,
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: u64,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub rating: u8,
    pub references: Vec<LogReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogsResponse {
    pub total_count: u64,
    pub logs: Vec<LogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLogInput {
    pub message: String,
    pub rating: Option<u8>,
    pub timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateLogInput {
    pub message: Option<String>,
    pub rating: Option<u8>,
    pub timestamp: Option<DateTime<Utc>>,
    pub references: Option<Vec<LogReference>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub user_name: String,
    pub date_format: String,
    pub default_rating: u8,
    pub timezone: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            user_name: String::new(),
            date_format: "MMM DD, YYYY".to_string(),
            default_rating: 1,
            timezone: "UTC".to_string(),
            theme: "light".to_string(),
        }
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

pub fn init(db_path: &str) -> Result<(), Error> {
    let db = Database::create(db_path)?;

    // Initialize tables
    let write_txn = db.begin_write()?;
    {
        write_txn.open_table(LOGS_TABLE)?;
        write_txn.open_table(SETTINGS_TABLE)?;
    }
    write_txn.commit()?;

    DB.set(db).map_err(|_| {
        redb::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "DB already initialized",
        ))
    })?;

    Ok(())
}

fn get_db() -> Result<&'static Database, DbError> {
    DB.get().ok_or(DbError::NotInitialized)
}

// ── Next ID (simple auto-increment via scan) ──────────────────────────────────

fn next_id() -> Result<u64, DbError> {
    let db = get_db()?;
    let read_txn = db.begin_read()?;
    let table = read_txn.open_table(LOGS_TABLE)?;
    let max = table
        .iter()?
        .filter_map(|r| r.ok())
        .map(|(k, _)| k.value())
        .max()
        .unwrap_or(100);
    Ok(max + 1)
}

// ── Log CRUD ──────────────────────────────────────────────────────────────────

pub fn create_log(input: CreateLogInput, default_rating: u8) -> Result<LogEntry, DbError> {
    let db = get_db()?;
    let id = next_id()?;

    let entry = LogEntry {
        id,
        message: input.message,
        timestamp: input.timestamp.unwrap_or_else(Utc::now),
        rating: input.rating.unwrap_or(default_rating).clamp(1, 5),
        references: vec![],
    };

    let json = serde_json::to_string(&entry)?;
    let write_txn = db.begin_write()?;
    {
        let mut table = write_txn.open_table(LOGS_TABLE)?;
        table.insert(id, json.as_str())?;
    }
    write_txn.commit()?;

    Ok(entry)
}

pub fn get_log(id: u64) -> Result<LogEntry, DbError> {
    let db = get_db()?;
    let read_txn = db.begin_read()?;
    let table = read_txn.open_table(LOGS_TABLE)?;
    let value = table.get(id)?.ok_or_else(|| {
        redb::Error::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Log not found",
        ))
    })?;
    let entry: LogEntry = serde_json::from_str(value.value())?;
    Ok(entry)
}

pub fn list_logs() -> Result<LogsResponse, DbError> {
    let db = get_db()?;
    let read_txn = db.begin_read()?;
    let table = read_txn.open_table(LOGS_TABLE)?;

    let mut logs: Vec<LogEntry> = table
        .iter()?
        .filter_map(|r| r.ok())
        .filter_map(|(_, v)| serde_json::from_str::<LogEntry>(v.value()).ok())
        .collect();

    // Sort by timestamp descending (newest first)
    logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let total_count = logs.len() as u64;
    Ok(LogsResponse { total_count, logs })
}

pub fn update_log(id: u64, input: UpdateLogInput) -> Result<LogEntry, DbError> {
    let mut entry = get_log(id)?;

    if let Some(message) = input.message {
        entry.message = message;
    }
    if let Some(rating) = input.rating {
        entry.rating = rating.clamp(1, 5);
    }
    if let Some(timestamp) = input.timestamp {
        entry.timestamp = timestamp;
    }
    if let Some(references) = input.references {
        entry.references = references;
    }

    let json = serde_json::to_string(&entry)?;
    let db = get_db()?;
    let write_txn = db.begin_write()?;
    {
        let mut table = write_txn.open_table(LOGS_TABLE)?;
        table.insert(id, json.as_str())?;
    }
    write_txn.commit()?;

    Ok(entry)
}

pub fn delete_log(id: u64) -> Result<(), DbError> {
    let db = get_db()?;
    let write_txn = db.begin_write()?;
    {
        let mut table = write_txn.open_table(LOGS_TABLE)?;
        table.remove(id)?;
    }
    write_txn.commit()?;
    Ok(())
}

// ── Settings ──────────────────────────────────────────────────────────────────

pub fn get_settings() -> Result<Settings, DbError> {
    let db = get_db()?;
    let read_txn = db.begin_read()?;
    let table = read_txn.open_table(SETTINGS_TABLE)?;

    match table.get("settings")? {
        Some(v) => Ok(serde_json::from_str(v.value())?),
        None => Ok(Settings::default()),
    }
}

pub fn save_settings(settings: Settings) -> Result<Settings, DbError> {
    let json = serde_json::to_string(&settings)?;
    let db = get_db()?;
    let write_txn = db.begin_write()?;
    {
        let mut table = write_txn.open_table(SETTINGS_TABLE)?;
        table.insert("settings", json.as_str())?;
    }
    write_txn.commit()?;
    Ok(settings)
}

// ── Import / Export ───────────────────────────────────────────────────────────

pub fn export_logs() -> Result<String, DbError> {
    let response = list_logs()?;
    Ok(serde_json::to_string_pretty(&response)?)
}

pub fn import_logs(json: &str) -> Result<u64, DbError> {
    let response: LogsResponse = serde_json::from_str(json)?;
    let db = get_db()?;
    let write_txn = db.begin_write()?;
    let count = response.logs.len() as u64;
    {
        let mut table = write_txn.open_table(LOGS_TABLE)?;
        for log in response.logs {
            let entry_json = serde_json::to_string(&log)?;
            table.insert(log.id, entry_json.as_str())?;
        }
    }
    write_txn.commit()?;
    Ok(count)
}
