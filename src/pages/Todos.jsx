import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import {
  store, navigateTo, loadTodos, addTodo, moveTodo, completeTodo, removeTodo, editTodo
} from "../store";
import { IconBack, IconPlus, IconCheck, IconGrip, IconTrash } from "../components/Icons";

// ── Custom pointer-based drag (works reliably in Tauri WebView) ───────────────
// HTML5 drag events have known bugs in WKWebView/WebView2:
//   - dataTransfer is restricted
//   - relatedTarget is null in dragLeave, breaking containment checks
//   - dragover fires inconsistently on empty columns
// Solution: track pointer position and hit-test column rects manually.

let pointerDragState = null; // { id, fromCol, clone, startX, startY }

const getDragClone = (cardEl) => {
  const rect = cardEl.getBoundingClientRect();
  const clone = cardEl.cloneNode(true);
  clone.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    pointer-events: none;
    opacity: 0.85;
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    transform: rotate(1.5deg) scale(1.03);
    transition: none;
    border-radius: 10px;
  `;
  document.body.appendChild(clone);
  return clone;
};

// ── Todo Page ─────────────────────────────────────────────────────────────────

const Todos = () => {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [dragOverCol, setDragOverCol] = createSignal(null); // "todo" | "doing" | null
  const [draggingId, setDraggingId] = createSignal(null);

  let todoBoardRef;
  let todoColRef;
  let doingColRef;

  onMount(() => {
    loadTodos();

    const onPointerMove = (e) => {
      if (!pointerDragState) return;
      const { clone, startX, startY, originX, originY } = pointerDragState;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      clone.style.left = (originX + dx) + "px";
      clone.style.top  = (originY + dy) + "px";

      // Hit-test which column the pointer is over
      const todoRect  = todoColRef?.getBoundingClientRect();
      const doingRect = doingColRef?.getBoundingClientRect();
      const x = e.clientX, y = e.clientY;

      const inRect = (r) => r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

      if (inRect(todoRect))       setDragOverCol("todo");
      else if (inRect(doingRect)) setDragOverCol("doing");
      else                         setDragOverCol(null);
    };

    const onPointerUp = async (e) => {
      if (!pointerDragState) return;
      const { id, fromCol, clone } = pointerDragState;
      clone.remove();
      pointerDragState = null;
      setDraggingId(null);

      const targetCol = dragOverCol();
      setDragOverCol(null);

      if (targetCol && targetCol !== fromCol) {
        await moveTodo(id, targetCol);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup",   onPointerUp);
    onCleanup(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup",   onPointerUp);
      pointerDragState?.clone?.remove();
      pointerDragState = null;
    });
  });

  const todoItems  = createMemo(() => store.todos.filter((t) => t.status === "todo"));
  const doingItems = createMemo(() => store.todos.filter((t) => t.status === "doing"));

  const handleCreate = async () => {
    const t = title().trim();
    if (!t || submitting()) return;
    setSubmitting(true);
    await addTodo(t, description());
    setTitle("");
    setDescription("");
    setSubmitting(false);
  };

  const handleFormKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
  };

  // Called by TodoCard's grip when the pointer goes down
  const startDrag = (e, cardEl, id, col) => {
    e.preventDefault(); // prevent text selection
    if (pointerDragState) return;
    const rect = cardEl.getBoundingClientRect();
    const clone = getDragClone(cardEl);
    pointerDragState = {
      id, fromCol: col, clone,
      startX: e.clientX, startY: e.clientY,
      originX: rect.left, originY: rect.top,
    };
    setDraggingId(id);
  };

  return (
    <div class="todos-page" ref={todoBoardRef}>
      {/* Header */}
      <section class="todos-header">
        <button class="icon-btn" onClick={() => navigateTo("home")} aria-label="Back">
          <IconBack />
        </button>
        <div class="todos-header__title-area">
          <h1 class="todos-header__title">Todo Board</h1>
        </div>
        <span class="todos-header__count">{store.todos.length} active</span>
      </section>

      {/* Task creation form */}
      <section class="todos-form-section">
        <div class="todos-form">
          <div class="todos-form__fields">
            <input
              class="todos-form__input todos-form__input--title"
              type="text"
              placeholder="Task title (required)"
              value={title()}
              onInput={(e) => setTitle(e.target.value)}
              onKeyDown={handleFormKeyDown}
              disabled={submitting()}
            />
            <input
              class="todos-form__input todos-form__input--desc"
              type="text"
              placeholder="Description (optional)"
              value={description()}
              onInput={(e) => setDescription(e.target.value)}
              onKeyDown={handleFormKeyDown}
              disabled={submitting()}
            />
          </div>
          <button
            class="btn-submit todos-form__submit"
            onClick={handleCreate}
            disabled={!title().trim() || submitting()}
            type="button"
          >
            {submitting() ? "Adding…" : <><IconPlus /> Add Task</>}
          </button>
        </div>
        <p class="todos-form__hint">Cmd+Enter to add · Drag grip to move · Click title to edit · ✓ to complete</p>
      </section>

      {/* Kanban board */}
      <section class="todos-board">
        <KanbanColumn
          ref={todoColRef}
          title="Todo"
          status="todo"
          items={todoItems()}
          dragOver={dragOverCol() === "todo"}
          draggingId={draggingId()}
          onStartDrag={startDrag}
          onComplete={null}
          onMove={(id) => moveTodo(id, "doing")}
          accentClass="col--todo"
        />
        <KanbanColumn
          ref={doingColRef}
          title="Doing"
          status="doing"
          items={doingItems()}
          dragOver={dragOverCol() === "doing"}
          draggingId={draggingId()}
          onStartDrag={startDrag}
          onComplete={completeTodo}
          onMove={null}
          accentClass="col--doing"
        />
      </section>
    </div>
  );
};

// ── Kanban Column ─────────────────────────────────────────────────────────────

const KanbanColumn = (props) => (
  <div
    ref={props.ref}
    class={`kanban-col ${props.accentClass}${props.dragOver ? " kanban-col--drag-over" : ""}`}
  >
    <div class="kanban-col__header">
      <span class="kanban-col__title">{props.title}</span>
      <span class="kanban-col__badge">{props.items.length}</span>
    </div>

    <div class="kanban-col__body">
      <Show
        when={props.items.length > 0}
        fallback={
          <div class="kanban-empty">
            <span class="kanban-empty__icon">{props.status === "todo" ? "✦" : "◎"}</span>
            <p>{props.status === "todo" ? "No tasks yet" : "Nothing in progress"}</p>
          </div>
        }
      >
        <For each={props.items}>
          {(todo) => (
            <TodoCard
              todo={todo}
              status={props.status}
              isDragging={props.draggingId === todo.id}
              onStartDrag={props.onStartDrag}
              onComplete={props.onComplete}
              onMove={props.onMove}
            />
          )}
        </For>
      </Show>
    </div>
  </div>
);

// ── Todo Card ─────────────────────────────────────────────────────────────────

const TodoCard = (props) => {
  const [completing, setCompleting] = createSignal(false);
  const [editing,   setEditing]   = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editDesc,  setEditDesc]  = createSignal("");
  const [saving,    setSaving]    = createSignal(false);

  let cardRef;

  const startEdit = () => {
    setEditTitle(props.todo.title);
    setEditDesc(props.todo.description || "");
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const t = editTitle().trim();
    if (!t || saving()) return;
    setSaving(true);
    await editTodo(props.todo.id, t, editDesc().trim());
    setSaving(false);
    setEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") cancelEdit();
  };

  const handleComplete = async () => {
    if (completing()) return;
    setCompleting(true);
    await props.onComplete(props.todo.id);
  };

  return (
    <div
      ref={cardRef}
      class={`todo-card${props.isDragging ? " todo-card--dragging" : ""}${completing() ? " todo-card--completing" : ""}${editing() ? " todo-card--editing" : ""}`}
    >
      <Show
        when={!editing()}
        fallback={
          <div class="todo-card__edit-form">
            <input
              class="todo-card__edit-input todo-card__edit-input--title"
              value={editTitle()}
              onInput={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleEditKeyDown}
              placeholder="Task title"
              autofocus
            />
            <input
              class="todo-card__edit-input todo-card__edit-input--desc"
              value={editDesc()}
              onInput={(e) => setEditDesc(e.target.value)}
              onKeyDown={handleEditKeyDown}
              placeholder="Description (optional)"
            />
            <div class="todo-card__edit-actions">
              <button class="todo-card__save-btn" onClick={saveEdit} disabled={!editTitle().trim() || saving()} type="button">
                {saving() ? "Saving…" : "Save"}
              </button>
              <button class="todo-card__cancel-btn" onClick={cancelEdit} type="button">Cancel</button>
            </div>
          </div>
        }
      >
        {/* View mode */}
        <>
          {/* Grip — pointer-down initiates custom drag */}
          <div
            class="todo-card__grip"
            title="Drag to move"
            onPointerDown={(e) => props.onStartDrag(e, cardRef, props.todo.id, props.status)}
          >
            <IconGrip />
          </div>

          {/* Body — click to edit */}
          <div class="todo-card__body" onClick={startEdit} title="Click to edit">
            <p class="todo-card__title">{props.todo.title}</p>
            <Show when={props.todo.description}>
              <p class="todo-card__desc">{props.todo.description}</p>
            </Show>
          </div>

          <div class="todo-card__actions">
            {/* ✓ Complete — Doing column only */}
            <Show when={props.onComplete}>
              <button
                class="todo-card__complete-btn"
                onClick={handleComplete}
                disabled={completing()}
                title="Mark as complete"
                type="button"
              >
                <IconCheck />
              </button>
            </Show>

            {/* → Start — Todo column only */}
            <Show when={props.onMove}>
              <button
                class="todo-card__move-btn"
                onClick={() => props.onMove(props.todo.id)}
                title="Move to Doing"
                type="button"
              >
                → Start
              </button>
            </Show>

            <button
              class="todo-card__delete-btn"
              onClick={() => removeTodo(props.todo.id)}
              title="Delete task"
              type="button"
            >
              <IconTrash />
            </button>
          </div>
        </>
      </Show>
    </div>
  );
};

export default Todos;
