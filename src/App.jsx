import { Show, createSignal, onMount } from "solid-js";
import { store, loadLogs, loadSettings, setLoading } from "./store";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Onboarding from "./components/Onboarding";
import Toast from "./components/Toast";

export default function App() {
  const [showOnboarding, setShowOnboarding] = createSignal(false);

  onMount(async () => {
    // Load settings first, then logs
    const settings = await loadSettings();
    await loadLogs();
    setLoading(false);

    // Show onboarding if no name set
    if (!settings?.user_name) {
      setShowOnboarding(true);
    }
  });

  function handleOnboardingDone() {
    setShowOnboarding(false);
  }

  return (
    <>
      <Show when={!store.loading} fallback={<LoadingScreen />}>
        <Show when={store.page === "home"} fallback={<Settings />}>
          <Home />
        </Show>
      </Show>

      <Show when={showOnboarding()}>
        <Onboarding onDone={handleOnboardingDone} />
      </Show>

      <Toast />
    </>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      color: "var(--text-muted)",
      "font-size": "0.875rem",
      "font-family": "'Work Sans', system-ui, sans-serif",
    }}>
      Loading…
    </div>
  );
}
