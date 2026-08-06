import { createSignal, createMemo, onMount, onCleanup, For, Show } from "solid-js";
import { store, navigateTo, showToast } from "../store";
import { formatTime } from "../utils/date";
import { IconBack, IconMarkdown, IconSort, IconLink } from "../components/Icons";
import flatpickr from "flatpickr";

// Rating scale: 5=Best (highest), 1=Routine (lowest) — sections displayed 5→1
const RATING_META = {
  5: { label: "Best",    emoji: "★" },
  4: { label: "Great",   emoji: "◆" },
  3: { label: "Solid",   emoji: "●" },
  2: { label: "Minor",   emoji: "◇" },
  1: { label: "Routine", emoji: "○" },
};

export default function Logs() {
  const [dateFrom, setDateFrom] = createSignal(null);   // Date object or null
  const [dateTo, setDateTo] = createSignal(null);       // Date object or null
  const [sortDir, setSortDir] = createSignal("desc");   // "asc" | "desc"
  const [dateRangeLabel, setDateRangeLabel] = createSignal("All time");

  let rangeInputRef;
  let fpInstance;

  onMount(() => {
    fpInstance = flatpickr(rangeInputRef, {
      mode: "range",
      dateFormat: "M j, Y",
      placeholder: "Filter by date range…",
      maxDate: 'today',
      onChange: (dates) => {
        if (dates.length === 2) {
          setDateFrom(dates[0]);
          // Set to end of day so the "to" date is inclusive
          const end = new Date(dates[1]);
          end.setHours(23, 59, 59, 999);
          setDateTo(end);
          setDateRangeLabel(
            `${dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dates[1].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
          );
        } else if (dates.length === 0) {
          setDateFrom(null);
          setDateTo(null);
          setDateRangeLabel("All time");
        }
      },
    });
  });

  onCleanup(() => fpInstance?.destroy());

  function clearDateRange() {
    fpInstance?.clear();
    setDateFrom(null);
    setDateTo(null);
    setDateRangeLabel("All time");
  }

  // Filtered + sorted logs
  const filteredLogs = createMemo(() => {
    let logs = store.logs;

    if (dateFrom()) logs = logs.filter(l => new Date(l.timestamp) >= dateFrom());
    if (dateTo())   logs = logs.filter(l => new Date(l.timestamp) <= dateTo());

    return [...logs].sort((a, b) => {
      const diff = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir() === "asc" ? diff : -diff;
    });
  });

  // Group by rating (5 down to 1), only include ratings that have entries
  const groupedByRating = createMemo(() => {
    const logs = filteredLogs();
    return [5, 4, 3, 2, 1]
      .map(r => ({ rating: r, logs: logs.filter(l => l.rating === r) }))
      .filter(g => g.logs.length > 0);
  });

  const totalFiltered = createMemo(() => filteredLogs().length);

  function formatLogDate(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function exportMarkdown() {
    const groups = groupedByRating();
    if (groups.length === 0) {
      showToast("No logs to export", "error");
      return;
    }

    const dateLabel = dateRangeLabel();
    const sortLabel = sortDir() === "asc" ? "oldest first" : "newest first";
    const lines = [
      `# Log Report`,
      ``,
      `**Period:** ${dateLabel}  `,
      `**Sort:** ${sortLabel}  `,
      `**Total logs:** ${totalFiltered()}`,
      ``,
      `---`,
      ``,
    ];

    for (const group of groups) {
      const meta = RATING_META[group.rating];
      lines.push(`## ${meta.emoji} Rating ${group.rating} — ${meta.label}`);
      lines.push(`*${group.logs.length} ${group.logs.length === 1 ? "entry" : "entries"}*`);
      lines.push(``);

      for (const log of group.logs) {
        lines.push(`### ${formatLogDate(log.timestamp)} · ${formatTime(log.timestamp)}`);
        lines.push(``);
        lines.push(log.message);
        lines.push(``);
        if (log.references?.length > 0) {
          lines.push(`**References:**`);
          for (const ref of log.references) {
            lines.push(`- [${ref.label}](${ref.url})${ref.type ? ` *(${ref.type})*` : ""}`);
          }
          lines.push(``);
        }
        lines.push(`---`);
        lines.push(``);
      }
    }

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-report-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdown exported", "success");
  }

  return (
    <div class="logs-page">
      {/* Header */}
      <section class="logs-header">
        <button class="icon-btn" onClick={() => navigateTo("home")} aria-label="Back">
          <IconBack />
        </button>
        <div class="logs-header__title-area">
          <h1 class="logs-header__title">Log sections</h1>
        </div>
        <Show when={totalFiltered() > 0}>
          <span class="logs-header__count">{totalFiltered()} entries</span>
        </Show>
      </section>

      {/* Filters bar */}
      <section class="logs-filters">
        <div class="logs-filters__date">
          <input
            ref={rangeInputRef}
            class="field__input flatpickr-input"
            type="text"
            placeholder="Filter by date range…"
            readOnly
            style={{ "min-width": "220px", cursor: "pointer" }}
          />
          <Show when={dateFrom()}>
            <button class="logs-filters__clear" onClick={clearDateRange} title="Clear date range" type="button">
              ✕
            </button>
          </Show>
        </div>
        <div class="logs-header__actions">
          <button
            class="btn btn--ghost"
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            type="button"
            title={sortDir() === "asc" ? "Oldest first — click for newest first" : "Newest first — click for oldest first"}
          >
            <IconSort />
            {sortDir() === "asc" ? "Oldest first" : "Newest first"}
          </button>
          <button
            class="btn btn--ghost"
            onClick={exportMarkdown}
            type="button"
            title="Export as Markdown"
          >
            <IconMarkdown /> Export MD
          </button>
        </div>
      </section>

      {/* Body */}
      <section class="logs-body">
        <Show
          when={totalFiltered() > 0}
          fallback={
            <div class="empty-state">
              <div class="empty-state__icon">✦</div>
              <p class="empty-state__title">No logs found</p>
              <p class="empty-state__desc">
                {store.logs.length === 0
                  ? "Start logging from the home screen"
                  : "Try adjusting the date range filter"}
              </p>
            </div>
          }
        >
          <For each={groupedByRating()}>
            {(group) => <RatingSection group={group} sortDir={sortDir()} />}
          </For>
        </Show>
      </section>
    </div>
  );
}

function RatingSection(props) {
  const { rating, logs } = props.group;
  const meta = RATING_META[rating];

  function formatLogDate(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <section class={`rating-section rating-section--${rating}`}>
      <div class="rating-section__header">
        <span class={`rating-section__badge rating-${rating}`}>
          {meta.emoji} {meta.label}
        </span>
        <span class="rating-section__divider" />
        <span class="rating-section__count">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div class="rating-section__timeline">
        <For each={logs}>
          {(log) => (
            <div class="logs-entry">
              <div class={`logs-entry__dot dot-rating-${rating}`} />
              <div class="logs-entry__content">
                <div class="logs-entry__date-time">
                  <span class="logs-entry__date">{formatLogDate(log.timestamp)}</span>
                  <span class="logs-entry__time">{formatTime(log.timestamp)}</span>
                </div>
                <p class={`logs-entry__message msg-rating-${rating}`}>{log.message}</p>
                <Show when={log.references?.length > 0}>
                  <div class="log-entry__refs" style={{ "margin-top": "6px" }}>
                    <For each={log.references}>
                      {(ref) => (
                        <a class="ref-chip" href={ref.url} target="_blank" rel="noopener noreferrer" title={ref.url}>
                          <IconLink />
                          {ref.label}
                          <Show when={ref.type}>
                            <span style={{ opacity: 0.6 }}>· {ref.type}</span>
                          </Show>
                        </a>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}
