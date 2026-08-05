import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import { api } from "../utils/api";

// ── App store ─────────────────────────────────────────────────────────────────

const [store, setStore] = createStore({
  logs: [],
  totalCount: 0,
  settings: null,         // null = not loaded yet
  loading: true,
  page: "home",           // "home" | "settings"
  selectedLogId: null,    // id of the log open in the panel
});

// Toast signal
const [toasts, setToasts] = createSignal([]);

// ── Toast helpers ─────────────────────────────────────────────────────────────

let toastId = 0;

export function showToast(message, type = "info", duration = 3000) {
  const id = ++toastId;
  setToasts((t) => [...t, { id, message, type }]);
  setTimeout(() => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, duration);
}

export { toasts };

// ── Store actions ─────────────────────────────────────────────────────────────

export async function loadLogs() {
  try {
    const response = await api.listLogs();
    setStore({ logs: response.logs, totalCount: response.total_count });
  } catch (e) {
    showToast(`Failed to load logs: ${e}`, "error");
  }
}

export async function addLog(message) {
  if (!message.trim()) return;
  try {
    const entry = await api.createLog(message.trim());
    setStore("logs", (logs) => [entry, ...logs]);
    setStore("totalCount", (c) => c + 1);
    showToast("Log added", "success");
    return entry;
  } catch (e) {
    showToast(`Failed to add log: ${e}`, "error");
  }
}

export async function updateLog(id, fields) {
  try {
    const updated = await api.updateLog(id, fields);
    setStore("logs", (log) => log.id === id, (log) => ({ ...log, ...updated }));
    showToast("Log updated", "success");
    return updated;
  } catch (e) {
    showToast(`Failed to update log: ${e}`, "error");
  }
}

export async function removeLog(id) {
  try {
    await api.deleteLog(id);
    setStore("logs", (logs) => logs.filter((l) => l.id !== id));
    setStore("totalCount", (c) => c - 1);
    setStore("selectedLogId", null);
    showToast("Log deleted");
  } catch (e) {
    showToast(`Failed to delete log: ${e}`, "error");
  }
}

export async function loadSettings() {
  try {
    const settings = await api.getSettings();
    setStore({ settings });
    // Apply theme
    if (settings.theme) applyTheme(settings.theme);
    return settings;
  } catch (e) {
    showToast(`Failed to load settings: ${e}`, "error");
  }
}

export async function saveSettings(settings) {
  try {
    const saved = await api.saveSettings(settings);
    setStore({ settings: saved });
    applyTheme(saved.theme);
    showToast("Settings saved", "success");
    return saved;
  } catch (e) {
    showToast(`Failed to save settings: ${e}`, "error");
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function selectLog(id) {
  setStore("selectedLogId", id);
}

export function closePanelAction() {
  setStore("selectedLogId", null);
}

export function navigateTo(page) {
  setStore("page", page);
}

export function setLoading(v) {
  setStore("loading", v);
}

export { store, setStore };
