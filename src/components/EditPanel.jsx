import { createSignal, createEffect, For, Show } from "solid-js";
import { store, updateLog, removeLog, closePanelAction } from "../store";
import { formatTimestamp, toISOFromLocal } from "../utils/date";
import { IconClose, IconPlus, IconTrash } from "./Icons";

const RATING_LABELS = { 1: "Low", 2: "Notable", 3: "Attention", 4: "Warning", 5: "Critical" };

export default function EditPanel() {
  const log = () => store.logs.find((l) => l.id === store.selectedLogId);

  const [message, setMessage] = createSignal("");
  const [rating, setRating] = createSignal(1);
  const [timestamp, setTimestamp] = createSignal("");
  const [refs, setRefs] = createSignal([]);
  const [saving, setSaving] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  // Sync state when log changes
  createEffect(() => {
    const l = log();
    if (l) {
      setMessage(l.message);
      setRating(l.rating);
      setTimestamp(formatTimestamp(l.timestamp));
      setRefs(l.references ? [...l.references] : []);
    }
  });

  function addRef() {
    setRefs((r) => [...r, { type: "", label: "", url: "" }]);
  }

  function removeRef(i) {
    setRefs((r) => r.filter((_, idx) => idx !== i));
  }

  function updateRef(i, field, val) {
    setRefs((r) => r.map((ref, idx) => (idx === i ? { ...ref, [field]: val } : ref)));
  }

  async function handleSave() {
    setSaving(true);
    await updateLog(log().id, {
      message: message(),
      rating: rating(),
      timestamp: toISOFromLocal(timestamp()),
      references: refs().filter((r) => r.label && r.url),
    });
    setSaving(false);
    closePanelAction();
  }

  async function handleDelete() {
    if (!confirm("Delete this log entry?")) return;
    setDeleting(true);
    await removeLog(log().id);
    setDeleting(false);
  }

  return (
    <Show when={log()}>
      <div class="panel-overlay" onClick={closePanelAction} />
      <div class="panel" role="dialog" aria-label="Edit log">

        {/* Header */}
        <div class="panel__header">
          <span class="panel__title">Edit log</span>
          <button class="icon-btn" onClick={closePanelAction} aria-label="Close">
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div class="panel__body">

          {/* Message */}
          <div class="field">
            <label class="field__label">Message</label>
            <textarea
              class="field__textarea"
              value={message()}
              onInput={(e) => setMessage(e.target.value)}
              rows="4"
            />
          </div>

          {/* Rating */}
          <div class="field">
            <label class="field__label">Rating</label>
            <div class="rating-selector">
              <For each={[1, 2, 3, 4, 5]}>
                {(r) => (
                  <button
                    class={`rating-selector__btn${rating() === r ? ` active-${r}` : ""}`}
                    onClick={() => setRating(r)}
                    type="button"
                    title={RATING_LABELS[r]}
                  >
                    {r}
                  </button>
                )}
              </For>
            </div>
            <span style={{ "font-size": "0.75rem", color: "var(--text-muted)", "margin-top": "4px" }}>
              {RATING_LABELS[rating()]}
            </span>
          </div>

          {/* Timestamp */}
          <div class="field">
            <label class="field__label">Timestamp</label>
            <input
              class="field__input"
              type="datetime-local"
              value={timestamp()}
              onInput={(e) => setTimestamp(e.target.value)}
            />
          </div>

          {/* References */}
          <div class="field">
            <label class="field__label">References</label>
            <div class="ref-list">
              <For each={refs()}>
                {(ref, i) => (
                  <div class="ref-row">
                    <div>
                      <input
                        class="field__input"
                        style={{ "font-size": "0.75rem", padding: "6px 8px" }}
                        placeholder="Type"
                        value={ref.type}
                        onInput={(e) => updateRef(i(), "type", e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
                      <input
                        class="field__input"
                        style={{ "font-size": "0.75rem", padding: "6px 8px" }}
                        placeholder="Label"
                        value={ref.label}
                        onInput={(e) => updateRef(i(), "label", e.target.value)}
                      />
                      <input
                        class="field__input"
                        style={{ "font-size": "0.75rem", padding: "6px 8px" }}
                        placeholder="https://..."
                        value={ref.url}
                        onInput={(e) => updateRef(i(), "url", e.target.value)}
                      />
                    </div>
                    <button
                      class="ref-row__remove"
                      onClick={() => removeRef(i())}
                      title="Remove"
                    >✕</button>
                  </div>
                )}
              </For>
            </div>
            <button class="btn-add-ref" onClick={addRef} type="button">
              <IconPlus /> Add reference
            </button>
          </div>

        </div>

        {/* Footer */}
        <div class="panel__footer">
          <button
            class="btn btn--danger"
            onClick={handleDelete}
            disabled={deleting()}
            type="button"
          >
            <IconTrash />
            {deleting() ? "Deleting…" : "Delete"}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button class="btn btn--ghost" onClick={closePanelAction} type="button">
              Cancel
            </button>
            <button
              class="btn btn--primary"
              onClick={handleSave}
              disabled={saving() || !message().trim()}
              type="button"
            >
              {saving() ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

      </div>
    </Show>
  );
}
