import { children, splitProps } from "solid-js";

const Modal = (props) => {
  const [local, rest] = splitProps(props, [
      "heading",
      "modalIsOpen",
      "handleClose",
      "children",
      "footer",
    ]);

    const resolvedChildren = children(() => local.children);
    const resolvedFooter = children(() => local.footer);

    // Close when clicking directly on the backdrop overlay
    const handleClickOverlay = (e) => {
      if (e.target === e.currentTarget) {
        local.handleClose();
      }
    };

    return (
      <dialog
        class="modal"
        open={local.modalIsOpen}
        onClick={handleClickOverlay}
        onClose={(e) => local.handleClose()}
        {...rest}
      >
        <article>
          <header>
            <button
              aria-label="Close"
              class="close-btn"
              onClick={(e) => local.handleClose()}
            />
            {local.heading && <h3>{local.heading}</h3>}
          </header>

          <div class="modal-content">
            {resolvedChildren()}
          </div>

          <footer>
            {resolvedFooter() ? (
              resolvedFooter()
            ) : (
              <button class="secondary" onClick={(e) => local.handleClose()}>
                Close
              </button>
            )}
          </footer>
        </article>
      </dialog>
    );
}

export default Modal;
