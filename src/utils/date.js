/**
 * Group an array of log entries by calendar date (local)
 * Returns an array of { dateKey, dateLabel, logs }
 */
export function groupByDate(logs) {
  const groups = new Map();

  for (const log of logs) {
    const d = new Date(log.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        dateKey: key,
        dateLabel: formatDateLabel(d),
        logs: [],
      });
    }
    groups.get(key).logs.push(log);
  }

  // Sort groups newest-first by dateKey, then sort entries within each group
  return Array.from(groups.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((group) => ({
      ...group,
      logs: [...group.logs].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ),
    }));
}

export function formatDateLabel(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - target) / 86400000;

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTimestamp(timestamp) {
  // Format for datetime-local input
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toISOFromLocal(localStr) {
  // Convert datetime-local string back to ISO
  return new Date(localStr).toISOString();
}

export function getFirstName(fullName) {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
