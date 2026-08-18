import { Show, createSignal, onMount } from "solid-js";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { store, loadLogs, loadSettings, setLoading } from "./store";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import Todos from "./pages/Todos";
import Onboarding from "./components/Onboarding";
import Toast from "./components/Toast";
import UpdateModal from "./components/UpdateModal";

const App = () => {
  const [showOnboarding, setShowOnboarding] = createSignal(false);

  // Update state
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const [updateVersion,   setUpdateVersion]   = createSignal("");
  const [updateObj,       setUpdateObj]       = createSignal(null); // raw object from plugin
  const [installing,      setInstalling]      = createSignal(false);
  const [progress,        setProgress]        = createSignal(0);

  onMount(async () => {
    const settings = await loadSettings();
    await loadLogs();
    setLoading(false);

    if (!settings?.user_name) setShowOnboarding(true);

    // Silent background update check on every launch
    checkForUpdate({ silent: true });
  });

  /**
   * Check for updates using tauri-plugin-updater.
   * silent=true  → show modal only if update found; swallow errors
   * silent=false → called from Settings; returns { upToDate } for toast
   */
  const checkForUpdate = async ({ silent = false } = {}) => {
    try {
      const update = await check();
      if (update?.available) {
        setUpdateObj(update);
        setUpdateVersion(update.version);
        setUpdateAvailable(true);
        return { upToDate: false };
      }
      return { upToDate: true };
    } catch (e) {
      if (!silent) throw e;
      return { upToDate: false };
    }
  };

  /**
   * Download, install, then relaunch — exactly as in the provided snippet.
   * Progress is tracked via the onChunk callback so the modal can show a bar.
   */
  const handleInstallUpdate = async () => {
    const update = updateObj();
    if (!update) return;
    setInstalling(true);
    setProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength ?? 0;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      // Relaunch the app with the new version
      await relaunch();
    } catch (e) {
      setInstalling(false);
      setProgress(0);
      // Re-throw so the modal can surface the error if needed
      console.error("Update failed:", e);
    }
  };

  const dismissUpdate = () => {
    if (!installing()) setUpdateAvailable(false);
  };

  return (
    <>
      <Show when={!store.loading} fallback={<LoadingScreen />}>
        <Show when={store.page === "home"}>
          <Home />
        </Show>
        <Show when={store.page === "settings"}>
          <Settings onCheckUpdate={checkForUpdate} />
        </Show>
        <Show when={store.page === "logs"}>
          <Logs />
        </Show>
        <Show when={store.page === "todos"}>
          <Todos />
        </Show>
      </Show>

      <Show when={showOnboarding()}>
        <Onboarding onDone={() => setShowOnboarding(false)} />
      </Show>

      <UpdateModal
        open={updateAvailable()}
        version={updateVersion()}
        installing={installing()}
        progress={progress()}
        onInstall={handleInstallUpdate}
        onClose={dismissUpdate}
      />

      <Toast />
    </>
  );
};

const LoadingScreen = () => (
  <div style={{
    height: "100vh", display: "flex", "align-items": "center",
    "justify-content": "center", color: "var(--text-muted)",
    "font-size": "0.875rem", "font-family": "'Red Hat Text', system-ui, sans-serif",
  }}>
    Loading…
  </div>
);

export default App;
