import { createSignal, createEffect, onMount, onCleanup, For, Show } from "solid-js";
import { store, updateLog, removeLog, closePanelAction } from "../store";
import { formatTimestamp, toISOFromLocal } from "../utils/date";
import { IconClose, IconPlus, IconTrash } from "./Icons";
import flatpickr from "flatpickr";

// Updated rating scale: 1=Routine, 2=Minor, 3=Solid, 4=Great, 5=Best
const RATING_LABELS = { 1: "Routine", 2: "Minor", 3: "Solid", 4: "Great", 5: "Best" };

const EditPanel = () => {
  const log = () => store.logs.find((l) => l.id === store.selectedLogId);
  const [message, setMessage] = createSignal("");
  const [rating, setRating] = createSignal(1);
  const [timestamp, setTimestamp] = createSignal("");
  const [refs, setRefs] = createSignal([]);
  const [saving, setSaving] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  let dateInputRef;
  let fpInstance;

  createEffect(() => {
    const l = log();
    if (l) {
      setMessage(l.message);
      setRating(l.rating);
      setTimestamp(formatTimestamp(l.timestamp));
      setRefs(l.references ? [...l.references] : []);
    }
  });

  onMount(() => {
    fpInstance = flatpickr(dateInputRef, {
      enableTime: true,
      dateFormat: "Y-m-d H:i",
      time_24hr: true,
      defaultDate: timestamp() ? new Date(timestamp()) : new Date(),
      maxDate: 'today',
      onChange: ([date]) => {
        if (date) {
          const pad = (n) => String(n).padStart(2, "0");
          setTimestamp(
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
          );
        }
      },
    });
  });

  // Sync flatpickr when log changes
  createEffect(() => {
    const ts = timestamp();
    if (fpInstance && ts) {
      fpInstance.setDate(new Date(ts), false);
    }
  });

  onCleanup(() => fpInstance?.destroy());

  const addRef = () => {
    setRefs((r) => [...r, { type: "", label: "", url: "" }]);
  }

  const removeRef = (i) => {
    setRefs((r) => r.filter((_, idx) => idx !== i));
  }

  const updateRef = (i, field, val) => {
    setRefs((r) => r.map((ref, idx) => (idx === i ? { ...ref, [field]: val } : ref)));
  }

  const handleSave = async () => {
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

  const handleDelete = async () => {
    if (!confirm("Delete this log entry?")) return;
    setDeleting(true);
    await removeLog(log().id);
    setDeleting(false);
  }

  return (
    <Show when={log()}>
      <div class="panel-overlay" onClick={closePanelAction} />
      <section class="panel" role="dialog" aria-label="Edit log">

        <div class="panel__header">
          <span class="panel__title">Edit log</span>
          <button class="icon-btn" onClick={closePanelAction} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div class="panel__body">

          <div class="field">
            <label class="field__label">Message</label>
            <textarea
              class="field__textarea"
              value={message()}
              onInput={(e) => setMessage(e.target.value)}
              rows="4"
            />
          </div>

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

          <div class="field">
            <label class="field__label">Timestamp</label>
            <input
              ref={dateInputRef}
              class="field__input flatpickr-input"
              type="text"
              placeholder="Pick date & time…"
              readOnly
            />
          </div>

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
                    <button class="ref-row__remove" onClick={() => removeRef(i())} title="Remove">✕</button>
                  </div>
                )}
              </For>
            </div>
            <button class="btn-add-ref" onClick={addRef} type="button">
              <IconPlus /> Add reference
            </button>
          </div>

        </div>

        <div class="panel__footer">
          <button class="btn btn--danger" onClick={handleDelete} disabled={deleting()} type="button">
            <IconTrash />
            {deleting() ? "Deleting…" : "Delete"}
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button class="btn btn--ghost" onClick={closePanelAction} type="button">Cancel</button>
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

      </section>
    </Show>
  );
}

export default EditPanel;
