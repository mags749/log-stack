import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import { api } from "../utils/api";

const [store, setStore] = createStore({
  logs: [],
  totalCount: 0,
  settings: null,
  loading: true,
  page: "home",        // "home" | "settings" | "logs" | "todos"
  selectedLogId: null,
  todos: [],
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

// Creates a system-generated log entry and prepends it to the store (no toast)
export const addSystemLog = async (message) => {
  try {
    const entry = await api.createLog(message, null, null, true);
    setStore("logs", (logs) => [entry, ...logs]);
    setStore("totalCount", (c) => c + 1);
    return entry;
  } catch (e) {
    showToast(`Failed to create system log: ${e}`, "error");
  }
}

export const updateLog = async (id, fields) => {
  try {
    const updated = await api.updateLog(id, fields);
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

export const removeLog = async (id) => {
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
    setStore({ logs: [], totalCount: 0, settings: null, page: "home", selectedLogId: null, todos: [] });
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

// ── Todo actions ──────────────────────────────────────────────────────────────

export const loadTodos = async () => {
  try {
    const todos = await api.listTodos();
    setStore({ todos });
  } catch (e) {
    showToast(`Failed to load todos: ${e}`, "error");
  }
}

export const addTodo = async (title, description) => {
  if (!title.trim()) return;
  try {
    const todo = await api.createTodo(title.trim(), description?.trim() || null);
    setStore("todos", (todos) => [todo, ...todos]);
    showToast("Task created", "success");
    return todo;
  } catch (e) {
    showToast(`Failed to create task: ${e}`, "error");
  }
}

export const moveTodo = async (id, newStatus) => {
  try {
    // Capture title BEFORE updating store to avoid race condition
    const todo = store.todos.find((t) => t.id === id);
    const updated = await api.updateTodo(id, { status: newStatus });
    setStore("todos", (todos) => todos.map((t) => (t.id === id ? { ...t, ...updated } : t)));

    // Trigger system log for Todo → Doing
    if (newStatus === "doing" && todo) {
      await addSystemLog(`Started working on - ${todo.title}`);
    }
    return updated;
  } catch (e) {
    showToast(`Failed to move task: ${e}`, "error");
  }
}

export const editTodo = async (id, title, description) => {
  try {
    const updated = await api.updateTodo(id, { title, description });
    setStore("todos", (todos) => todos.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    showToast("Task updated", "success");
    return updated;
  } catch (e) {
    showToast(`Failed to update task: ${e}`, "error");
  }
}

export const completeTodo = async (id) => {
  try {
    const todo = store.todos.find((t) => t.id === id);
    await api.updateTodo(id, { status: "done" });
    // Remove from active board
    setStore("todos", (todos) => todos.filter((t) => t.id !== id));
    showToast("Task completed!", "success");

    // Trigger system log
    if (todo) {
      await addSystemLog(`Completed - ${todo.title}`);
    }
  } catch (e) {
    showToast(`Failed to complete task: ${e}`, "error");
  }
}

export const removeTodo = async (id) => {
  try {
    await api.deleteTodo(id);
    setStore("todos", (todos) => todos.filter((t) => t.id !== id));
    showToast("Task deleted");
  } catch (e) {
    showToast(`Failed to delete task: ${e}`, "error");
  }
}

export { store, setStore };
