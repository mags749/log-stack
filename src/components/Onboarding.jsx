import { createSignal } from "solid-js";
import { saveSettings, store } from "../store";

const Onboarding = (props) => {
  const [name, setName] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name().trim()) return;
    setSaving(true);
    const current = store.settings || {};
    await saveSettings({ ...current, user_name: name().trim() });
    setSaving(false);
    props.onDone?.();
  }

  return (
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal__icon">✦</div>
        <h1 class="modal__title">Welcome to Daily Logger</h1>
        <p class="modal__desc">
          A quiet place to record what happens, rate its significance, and look back over time.
          What should we call you?
        </p>

        <form onSubmit={handleSubmit}>
          <div class="field">
            <label class="field__label" for="onboard-name">Your name</label>
            <input
              id="onboard-name"
              class="field__input"
              type="text"
              placeholder="e.g. Alex"
              value={name()}
              onInput={(e) => setName(e.target.value)}
              autocomplete="off"
              autofocus
            />
          </div>

          <div class="modal__actions">
            <button
              class="btn btn--primary"
              type="submit"
              disabled={!name().trim() || saving()}
            >
              {saving() ? "Saving…" : "Get started"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Onboarding
