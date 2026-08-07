import { createSignal, createEffect, For } from "solid-js";
import { open } from "@tauri-apps/plugin-shell";
import { store, saveSettings, navigateTo, showToast, doFactoryReset, loadSettings, loadLogs } from "../store";
import { api } from "../utils/api";
import { TIMEZONES, DATE_FORMATS } from '../utils/date';
import { IconBack, IconUpload, IconDownload, IconWarning, IconHelp } from "../components/Icons";
import { PicoDropdown } from "../components/PicoDropdown";
import Modal from "../components/Modal";

const RATING_LABELS = { 1: "Routine", 2: "Minor", 3: "Solid", 4: "Great", 5: "Best" };

const Settings = () => {
  const s = () => store.settings || {};

  const [name, setName] = createSignal("");
  const [dateFormat, setDateFormat] = createSignal("MMM DD, YYYY");
  const [defaultRating, setDefaultRating] = createSignal(1);
  const [timezone, setTimezone] = createSignal("UTC");
  const [theme, setTheme] = createSignal("light");
  const [saving, setSaving] = createSignal(false);
  const [confirmReset, setConfirmReset] = createSignal(false);
  const [resetting, setResetting] = createSignal(false);
  const [modalIsOpen, setModalIsOpen] = createSignal(false);

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

  const handleSave = async () => {
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

  const handleExport = async () => {
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

  const handleImport = async () => {
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
        await loadLogs();
      } catch (err) {
        showToast(`Import failed: ${err}`, "error");
      }
    };
    input.click();
  }

  const handleFactoryReset = async () => {
    setResetting(true);
    const ok = await doFactoryReset();
    setResetting(false);
    setConfirmReset(false);
    if (ok) {
      // Reload settings (now blank) to reset local signals
      await loadSettings();
      navigateTo("home");
    }
  }

  const openExternalLink = async(url) => {
    // Opens the URL in the system's default browser
    await open(url);
  }

  return (
    <div class="settings-page">
      <div class="settings-header">
        <button class="icon-btn" onClick={() => navigateTo("home")} aria-label="Back">
          <IconBack />
        </button>
        <h1 class="settings-header__title">Settings</h1>
      </div>

      <div class="settings-body">

        {/* Profile */}
        <section class="settings-section">
          <h2 class="settings-section__title">Profile</h2>
          <div class="settings-section__fields">
            <div class="field">
              <label class="field__label">Your name</label>
              <input
                class="field__input" type="text" value={name()}
                onInput={(e) => setName(e.target.value)} placeholder="Your name"
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
                <button class={`theme-toggle__btn${theme() === "light" ? " active" : ""}`}
                  onClick={() => setTheme("light")} type="button">☀ Light</button>
                <button class={`theme-toggle__btn${theme() === "dark" ? " active" : ""}`}
                  onClick={() => setTheme("dark")} type="button">☾ Dark</button>
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
                      onClick={() => setDefaultRating(r)} type="button"
                      title={RATING_LABELS[r]}
                    >
                      {r}
                    </button>
                  )}
                </For>
              </div>
              <span style={{ "font-size": "0.75rem", color: "var(--text-muted)", "margin-top": "4px" }}>
                Default: {RATING_LABELS[defaultRating()]}
              </span>
            </div>
            <div class="field-set">
              <div class="field">
                <label class="field__label">Date format</label>
                <PicoDropdown
                  value={dateFormat()}
                  onChange={setDateFormat}
                  options={DATE_FORMATS}
                  placeholder="Date format" />
              </div>

              <div class="field">
                <label class="field__label">Timezone</label>
                  <PicoDropdown
                    value={timezone()}
                    onChange={setTimezone}
                    options={TIMEZONES}
                    placeholder="Timezone for the date" />
              </div>
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

        {/* Danger zone */}
        <section class="settings-section settings-section--danger">
          <h2 class="settings-section__title settings-section__title--danger">Danger zone</h2>
          <div class="settings-section__fields">
            <p class="settings-danger__desc">
              Factory reset will permanently delete all logs and settings. This cannot be undone.
            </p>

            {confirmReset() ? (
              <div class="reset-confirm">
                <div class="reset-confirm__warning">
                  <IconWarning />
                  <span>Are you sure? All logs and settings will be permanently deleted.</span>
                </div>
                <div class="reset-confirm__actions">
                  <button class="btn btn--ghost" onClick={() => setConfirmReset(false)} type="button">
                    Cancel
                  </button>
                  <button
                    class="btn btn--danger-solid"
                    onClick={handleFactoryReset}
                    disabled={resetting()}
                    type="button"
                  >
                    {resetting() ? "Resetting…" : "Yes, delete everything"}
                  </button>
                </div>
              </div>
            ) : (
              <button class="btn btn--danger" onClick={() => setConfirmReset(true)} type="button">
                Factory reset
              </button>
            )}
          </div>
        </section>

        {/* Save */}
        <div class="setting-footer">
          <button class="btn btn--primary" onClick={handleSave} disabled={saving()} type="button">
            {saving() ? "Saving…" : "Save settings"}
          </button>
          <button class="icon-btn" onClick={() => setModalIsOpen(true)} aria-label="information-help">
            <IconHelp />
          </button>
        </div>
      </div>
      <Show when={modalIsOpen()}>
        <Modal
          heading="About app"
          modalIsOpen={modalIsOpen()}
          handleClose={() => setModalIsOpen(false)}
        >
          <div class="star-link">
          <p>Made by:</p>
          <button onClick={() => openExternalLink("https://yogirajpujari.dev/")} aria-label="information-help" style="cursor: pointer;">
            <label style="font-weight: 700; text-decoration: underline;">Yogiraj Pujari</label>
            </button>
          </div>

          <div class="star-link">
            <p>Care for a </p>
            <button class="icon-btn" onClick={() => openExternalLink("https://github.com/mags749/log-stack")} aria-label="information-help">
              ★
            </button>
          </div>

        </Modal>
      </Show>
    </div>
  );
}

export default Settings;
