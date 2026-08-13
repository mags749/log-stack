import { createSignal, Show } from "solid-js";
import { store, addLog, navigateTo } from "../store";
import { getFirstName, getGreeting } from "../utils/date";
import Timeline from "../components/Timeline";
import EditPanel from "../components/EditPanel";
import { IconGear, IconArrow, IconLogs, IconKanban } from "../components/Icons";

const Home = () => {
  const [message, setMessage] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const firstName = () => getFirstName(store.settings?.user_name || "");
  const greeting = () => getGreeting();

  const handleSubmit = async () => {
    const msg = message().trim();
    if (!msg || submitting()) return;
    setSubmitting(true);
    await addLog(msg);
    setMessage("");
    setSubmitting(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const handleInput = (e) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  return (
    <div class="app">
      <section class="topbar">
        <div class="topbar__greeting">
          <Show when={firstName()} fallback={<span>{greeting()}</span>}>
            {greeting()}, <strong>{firstName()}</strong>
          </Show>
        </div>
        <div class="topbar__actions">
          <Show when={store.totalCount > 0}>
            <span style={{ "font-size": "14px", color: "var(--text-muted)", "margin-right": "4px" }}>
              {store.totalCount} {store.totalCount === 1 ? "log" : "logs"}
            </span>
          </Show>
          <button
            class="icon-btn"
            onClick={() => navigateTo("todos")}
            aria-label="Todo board"
            title="Todo Board"
          >
            <IconKanban />
          </button>
          <button
            class="icon-btn"
            onClick={() => navigateTo("logs")}
            aria-label="View all logs"
            title="Log sections"
          >
            <IconLogs />
          </button>
          <button
            class="icon-btn"
            onClick={() => navigateTo("settings")}
            aria-label="Settings"
            title="Settings"
          >
            <IconGear />
          </button>
        </div>
      </section>

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
              <span class="entry-area__hint">Enter to log · Shift+Enter for new line</span>
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
        <Timeline />
      </section>

      <Show when={store.selectedLogId !== null}>
        <EditPanel />
      </Show>
    </div>
  );
}

export default Home;
