import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import { api } from "../utils/api";

const [store, setStore] = createStore({
  logs: [],
  totalCount: 0,
  settings: null,
  loading: true,
  page: "home",        // "home" | "settings" | "logs"
  selectedLogId: null,
});

const [toasts, setToasts] = createSignal([]);
let toastId = 0;

export const showToast = (message, type = "info", duration = 3000) => {
  const id = ++toastId;
  setToasts((t) => [...t, { id, message, type }]);
  setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
}

export { toasts };

export const loadLogs = async () => {
  try {
    const response = await api.listLogs();
    setStore({ logs: response.logs, totalCount: response.total_count });
  } catch (e) {
    showToast(`Failed to load logs: ${e}`, "error");
  }
}

export const addLog = async (message) => {
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

export const updateLog = async (id, fields) => {
  try {
    const updated = await api.updateLog(id, fields);
    // Build a new sorted array and assign it directly so Solid's
    // reactivity detects the reference change and re-runs all memos
    const next = store.logs
      .map((l) => (l.id === id ? { ...l, ...updated } : l))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setStore("logs", next);
    showToast("Log updated", "success");
    return updated;
  } catch (e) {
    showToast(`Failed to update log: ${e}`, "error");
  }
}

export const removeLog =  async (id) => {
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

export const loadSettings = async () => {
  try {
    const settings = await api.getSettings();
    setStore({ settings });
    if (settings.theme) applyTheme(settings.theme);
    return settings;
  } catch (e) {
    showToast(`Failed to load settings: ${e}`, "error");
  }
}

export const saveSettings = async (settings) => {
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

export const doFactoryReset = async () => {
  try {
    await api.factoryReset();
    setStore({ logs: [], totalCount: 0, settings: null, page: "home", selectedLogId: null });
    applyTheme("light");
    showToast("App reset to factory defaults", "success");
    return true;
  } catch (e) {
    showToast(`Factory reset failed: ${e}`, "error");
    return false;
  }
}

export const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
}

export const selectLog = (id) => {
  setStore("selectedLogId", id);
}

export const closePanelAction = () => {
  setStore("selectedLogId", null);
}

export const navigateTo = (page) => {
  setStore("selectedLogId", null);
  setStore("page", page);
}

export const setLoading = (v) => {
  setStore("loading", v);
}

export { store, setStore };
