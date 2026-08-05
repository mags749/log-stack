import { createSignal, createEffect, For } from "solid-js";
import { store, saveSettings, navigateTo, showToast } from "../store";
import { api } from "../utils/api";
import { IconBack, IconUpload, IconDownload } from "../components/Icons";

const DATE_FORMATS = [
  "MMM DD, YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD MMM YYYY",
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export default function Settings() {
  const s = () => store.settings || {};

  const [name, setName] = createSignal("");
  const [dateFormat, setDateFormat] = createSignal("MMM DD, YYYY");
  const [defaultRating, setDefaultRating] = createSignal(1);
  const [timezone, setTimezone] = createSignal("UTC");
  const [theme, setTheme] = createSignal("light");
  const [saving, setSaving] = createSignal(false);

  createEffect(() => {
    const settings = s();
    if (settings) {
      setName(settings.user_name || "");
      setDateFormat(settings.date_format || "MMM DD, YYYY");
      setDefaultRating(settings.default_rating || 1);
      setTimezone(settings.timezone || "UTC");
      setTheme(settings.theme || "light");
    }
  });

  async function handleSave() {
    setSaving(true);
    await saveSettings({
      user_name: name(),
      date_format: dateFormat(),
      default_rating: defaultRating(),
      timezone: timezone(),
      theme: theme(),
    });
    setSaving(false);
  }

  async function handleExport() {
    try {
      const json = await api.exportLogs();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `log-stack-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Logs exported", "success");
    } catch (e) {
      showToast(`Export failed: ${e}`, "error");
    }
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await api.importLogs(text);
        showToast(`Imported ${count} logs`, "success");
        // Reload logs
        const { loadLogs } = await import("../store");
        await loadLogs();
      } catch (err) {
        showToast(`Import failed: ${err}`, "error");
      }
    };
    input.click();
  }

  return (
    <div class="settings-page">

      {/* Header */}
      <div class="settings-header">
        <button class="icon-btn" onClick={() => navigateTo("home")} aria-label="Back">
          <IconBack />
        </button>
        <h1 class="settings-header__title">Settings</h1>
      </div>

      {/* Body */}
      <div class="settings-body">

        {/* Profile */}
        <section class="settings-section">
          <h2 class="settings-section__title">Profile</h2>
          <div class="settings-section__fields">
            <div class="field">
              <label class="field__label">Your name</label>
              <input
                class="field__input"
                type="text"
                value={name()}
                onInput={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section class="settings-section">
          <h2 class="settings-section__title">Appearance</h2>
          <div class="settings-section__fields">
            <div class="field">
              <label class="field__label">Theme</label>
              <div class="theme-toggle">
                <button
                  class={`theme-toggle__btn${theme() === "light" ? " active" : ""}`}
                  onClick={() => setTheme("light")}
                  type="button"
                >
                  ☀ Light
                </button>
                <button
                  class={`theme-toggle__btn${theme() === "dark" ? " active" : ""}`}
                  onClick={() => setTheme("dark")}
                  type="button"
                >
                  ☾ Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Logs */}
        <section class="settings-section">
          <h2 class="settings-section__title">Logs</h2>
          <div class="settings-section__fields">

            <div class="field">
              <label class="field__label">Default rating</label>
              <div class="rating-selector">
                <For each={[1, 2, 3, 4, 5]}>
                  {(r) => (
                    <button
                      class={`rating-selector__btn${defaultRating() === r ? ` active-${r}` : ""}`}
                      onClick={() => setDefaultRating(r)}
                      type="button"
                    >
                      {r}
                    </button>
                  )}
                </For>
              </div>
            </div>

            <div class="field">
              <label class="field__label">Date format</label>
              <select
                class="field__select"
                value={dateFormat()}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <For each={DATE_FORMATS}>
                  {(f) => <option value={f}>{f}</option>}
                </For>
              </select>
            </div>

            <div class="field">
              <label class="field__label">Timezone</label>
              <select
                class="field__select"
                value={timezone()}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <For each={TIMEZONES}>
                  {(tz) => <option value={tz}>{tz}</option>}
                </For>
              </select>
            </div>

          </div>
        </section>

        {/* Data */}
        <section class="settings-section">
          <h2 class="settings-section__title">Data</h2>
          <div class="data-actions">
            <button class="btn btn--ghost" onClick={handleExport} type="button">
              <IconDownload /> Export JSON
            </button>
            <button class="btn btn--ghost" onClick={handleImport} type="button">
              <IconUpload /> Import JSON
            </button>
          </div>
        </section>

        {/* Save */}
        <div>
          <button
            class="btn btn--primary"
            onClick={handleSave}
            disabled={saving()}
            type="button"
          >
            {saving() ? "Saving…" : "Save settings"}
          </button>
        </div>

      </div>
    </div>
  );
}
