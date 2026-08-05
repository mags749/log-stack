import { createSignal, Show } from "solid-js";
import { store, addLog, navigateTo } from "../store";
import { getFirstName, getGreeting } from "../utils/date";
import Timeline from "../components/Timeline";
import EditPanel from "../components/EditPanel";
import { IconGear, IconArrow } from "../components/Icons";

export default function Home() {
  const [message, setMessage] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const firstName = () => getFirstName(store.settings?.user_name || "");
  const greeting = () => getGreeting();

  async function handleSubmit() {
    const msg = message().trim();
    if (!msg || submitting()) return;
    setSubmitting(true);
    await addLog(msg);
    setMessage("");
    setSubmitting(false);
  }

  function handleKeyDown(e) {
    // Enter to submit, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Auto-resize textarea
  function handleInput(e) {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  return (
    <div class="app">

      {/* Top bar */}
      <div class="topbar">
        <div class="topbar__greeting">
          <Show when={firstName()} fallback={<span>{greeting()}</span>}>
            {greeting()}, <strong>{firstName()}</strong>
          </Show>
        </div>
        <div class="topbar__actions">
          <Show when={store.totalCount > 0}>
            <span style={{
              "font-size": "0.75rem",
              color: "var(--text-muted)",
              "margin-right": "4px"
            }}>
              {store.totalCount} {store.totalCount === 1 ? "log" : "logs"}
            </span>
          </Show>
          <button
            class="icon-btn"
            onClick={() => navigateTo("settings")}
            aria-label="Settings"
            title="Settings"
          >
            <IconGear />
          </button>
        </div>
      </div>

      {/* Entry area */}
      <section class="main-content">
      <div class="entry-area">
        <div class="entry-area__inner">
          <textarea
            class="entry-area__textarea"
            placeholder="What happened? Press Enter to log…"
            value={message()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={submitting()}
            rows="2"
          />
          <div class="entry-area__footer">
            <span class="entry-area__hint">
              Enter to log · Shift+Enter for new line
            </span>
            <button
              class="btn-submit"
              onClick={handleSubmit}
              disabled={!message().trim() || submitting()}
              type="button"
            >
              {submitting() ? "Adding…" : <>Log it <IconArrow /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
        <Timeline />
      </section>

      {/* Edit panel (conditionally rendered) */}
      <Show when={store.selectedLogId !== null}>
        <EditPanel />
      </Show>

    </div>
  );
}
