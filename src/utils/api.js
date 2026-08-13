import { invoke } from "@tauri-apps/api/core";

export const api = {
  async listLogs() {
    return invoke("list_logs");
  },
  async createLog(message, rating = null, timestamp = null, isSystemGenerated = false) {
    return invoke("create_log", {
      input: { message, rating, timestamp, is_system_generated: isSystemGenerated },
    });
  },
  async updateLog(id, fields) {
    return invoke("update_log", { id, input: fields });
  },
  async deleteLog(id) {
    return invoke("delete_log", { id });
  },
  async getSettings() {
    return invoke("get_settings");
  },
  async saveSettings(settings) {
    return invoke("save_settings", { settings });
  },
  async exportLogs() {
    return invoke("export_logs");
  },
  async importLogs(json) {
    return invoke("import_logs", { json });
  },
  async factoryReset() {
    return invoke("factory_reset");
  },
  // ── Todo API ────────────────────────────────────────────────────────────────
  async listTodos() {
    return invoke("list_todos");
  },
  async createTodo(title, description = null) {
    return invoke("create_todo", { input: { title, description } });
  },
  async updateTodo(id, fields) {
    return invoke("update_todo", { id, input: fields });
  },
  async deleteTodo(id) {
    return invoke("delete_todo", { id });
  },
};
