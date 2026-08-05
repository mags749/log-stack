import { For } from "solid-js";
import { toasts } from "../store";

export default function Toast() {
  return (
    <div class="toast-container">
      <For each={toasts()}>
        {(t) => (
          <div class={`toast toast--${t.type}`}>{t.message}</div>
        )}
      </For>
    </div>
  );
}
