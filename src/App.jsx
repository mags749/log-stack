import { Show, createSignal, onMount } from "solid-js";
import { store, loadLogs, loadSettings, setLoading } from "./store";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import Onboarding from "./components/Onboarding";
import Toast from "./components/Toast";

const App = () => {
  const [showOnboarding, setShowOnboarding] = createSignal(false);

  onMount(async () => {
    const settings = await loadSettings();
    await loadLogs();
    setLoading(false);
    if (!settings?.user_name) {
      setShowOnboarding(true);
    }
  });

  return (
    <>
      <Show when={!store.loading} fallback={<LoadingScreen />}>
        <Show when={store.page === "home"}>
          <Home />
        </Show>
        <Show when={store.page === "settings"}>
          <Settings />
        </Show>
        <Show when={store.page === "logs"}>
          <Logs />
        </Show>
      </Show>

      <Show when={showOnboarding()}>
        <Onboarding onDone={() => setShowOnboarding(false)} />
      </Show>

      <Toast />
    </>
  );
}

const LoadingScreen = () => (
    <div style={{
      height: "100vh", display: "flex", "align-items": "center",
      "justify-content": "center", color: "var(--text-muted)",
      "font-size": "0.875rem", "font-family": "'Work Sans', system-ui, sans-serif",
    }}>
      Loading…
    </div>
  );

export default App;
