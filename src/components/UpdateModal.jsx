import { Show } from "solid-js";
import Modal from "./Modal";

/**
 * UpdateModal
 *
 * Props:
 *   open       — boolean
 *   version    — string, e.g. "1.2.0"
 *   onClose    — () => void
 *   onInstall  — async () => void  — handed in from App so the download
 *                progress state lives in one place
 */
const UpdateModal = (props) => (
  <Show when={props.open}>
    <Modal
      heading="App update"
      modalIsOpen={props.open}
      handleClose={props.onClose}
      footer={
        <button
          class="btn btn--primary update-modal__cta"
          onClick={props.onInstall}
          disabled={props.installing}
          type="button"
        >
          {props.installing
            ? `Downloading… ${props.progress > 0 ? props.progress + "%" : ""}`
            : "Update now"}
        </button>
      }
    >
      <div class="update-modal__body">
        <div class="update-modal__icon">🎉</div>
        <p class="update-modal__message">
          Great news!! Update available&nbsp;
          <strong class="update-modal__version">v{props.version}</strong>
        </p>
        <Show when={props.installing}>
          <div class="update-modal__progress-bar">
            <div
              class="update-modal__progress-fill"
              style={{ width: `${props.progress}%` }}
            />
          </div>
        </Show>
        <Show when={!props.installing}>
          <p class="update-modal__sub">
            The update will be downloaded and installed automatically. The app
            will relaunch once complete.
          </p>
        </Show>
      </div>
    </Modal>
  </Show>
);

export default UpdateModal;
