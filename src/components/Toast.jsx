import { For } from "solid-js";
import { toasts } from "../store";

const Toast = () => (
    <div class="toast-container">
      <For each={toasts()}>
        {(t) => (
          <div class={`toast toast--${t.type}`}>{t.message}</div>
        )}
      </For>
    </div>
  );

export default Toast;
