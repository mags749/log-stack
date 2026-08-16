import { For, Show, createMemo } from "solid-js";
import { store, selectLog } from "../store";
import { groupByDate, formatTime } from "../utils/date";
import { IconLink } from "./Icons";

const RATING_LABEL = { 1: "Routine", 2: "Minor", 3: "Solid", 4: "Great", 5: "Best" };

const Timeline = () => {
  const groups = createMemo(() => groupByDate(store.logs, store.settings));

  return (
    <div class="timeline-container">
      <Show
        when={store.logs.length > 0}
        fallback={
          <div class="empty-state">
            <div class="empty-state__icon">✦</div>
            <p class="empty-state__title">Nothing logged yet</p>
            <p class="empty-state__desc">Write your first entry above and press Enter</p>
          </div>
        }
      >
        <For each={groups()}>
          {(group) => (
            <div class="day-group animate-slide-up">
              <div class="day-group__header">
                <span class="day-group__date">{group.dateLabel}</span>
                <span class="day-group__count">{group.logs.length}</span>
              </div>

              <div class="timeline">
                <For each={group.logs}>
                  {(log) => <LogRow log={log} />}
                </For>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

const LogRow = (props) => {
  const log = () => props.log;
  const r   = () => log().rating;
  const s   = () => store.settings || {};

  const time = () => formatTime(log().timestamp, s().timezone);

  return (
    <div class="log-row" onClick={() => selectLog(log().id)}>
      {/* Dot sits centered ON the vertical line via absolute positioning */}
      <div class={`log-row__dot dot-rating-${r()}`} />

      {/* Message — grows to fill available space */}
      <p class={`log-row__message msg-rating-${r()}`}>
        {log().message}
      </p>

      {/* Right-side meta */}
      <div class="log-row__meta">
        <Show when={log().references?.length > 0}>
          <div class="log-row__refs">
            <For each={log().references}>
              {(ref) => (
                <a
                  class="ref-chip"
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={ref.url}
                >
                  <IconLink />
                  {ref.label}
                  <Show when={ref.type}>
                    <span style={{ opacity: 0.55 }}>· {ref.type}</span>
                  </Show>
                </a>
              )}
            </For>
          </div>
        </Show>
        <span class={`rating-badge rating-${r()}`}>{RATING_LABEL[r()]}</span>
        <span class="log-row__time">{time()}</span>
      </div>
    </div>
  );
};

export default Timeline;
