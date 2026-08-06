
export const DATE_FORMATS = [
  "MMM DD, YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD MMM YYYY",
];

export const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

/**
 * Group an array of log entries by calendar date (local)
 * Returns an array of { dateKey, dateLabel, logs }
 */
export const groupByDate = (logs, settings) => {
  const groups = new Map();

  for (const log of logs) {
    const d = new Date(log.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        dateKey: key,
        dateLabel: formatDateLabel(d, settings.timezone),
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

const formatDateLabel = (date, timeZone = "UTC") => {
  const d = typeof date === "number" || typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  // Helper to get normalized midnight Date for a given timestamp in a target timezone
  const getMidnightInZone = (targetDate) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(targetDate).map((p) => [p.type, p.value])
    );

    // Creates a local Date representing midnight (00:00:00) on that timezone's Y/M/D
    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  };

  const today = getMidnightInZone(new Date());
  const target = getMidnightInZone(d);

  // Rounding handles daylight saving time shifts (23h or 25h days)
  const diff = Math.round((today - target) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > -7 && diff < 0) return "Tomorrow"; // Optional handling for future dates
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long", timeZone });
  }

  // Get current year in target timezone to decide if year should be displayed
  const currentYear = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" })
    .formatToParts(new Date())
    .find((p) => p.type === "year").value;

  const targetYear = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" })
    .formatToParts(d)
    .find((p) => p.type === "year").value;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: targetYear !== currentYear ? "numeric" : undefined,
    timeZone,
  });
}

export const formatTime = (timestamp, timezone = "UTC") => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone
  });
}

export const formatTimestamp = (timestamp) => {
  // Format for datetime-local input
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const toISOFromLocal = (localStr) => {
  // Convert datetime-local string back to ISO
  return new Date(localStr).toISOString();
}

export const getFirstName = (fullName) => {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Formats a given Date object or timestamp according to target format & timezone.
 *
 * @param {Date|number|string} dateInput - Date object, timestamp, or ISO string.
 * @param {string} format - One of DATE_FORMATS
 * @param {string} timeZone - One of TIMEZONES
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput, format, timeZone = "UTC") => {
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided.");
  }

  // Extract timezone-adjusted date parts using Intl
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const monthShortFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(p => [p.type, p.value])
  );

  const YYYY = parts.year;
  const MM = parts.month;
  const DD = parts.day;
  const MMM = monthShortFormatter.format(date);

  // Map requested format to the formatted parts
  switch (format) {
    case "MMM DD, YYYY":
      return `${MMM} ${DD}, ${YYYY}`;
    case "DD/MM/YYYY":
      return `${DD}/${MM}/${YYYY}`;
    case "MM/DD/YYYY":
      return `${MM}/${DD}/${YYYY}`;
    case "YYYY-MM-DD":
      return `${YYYY}-${MM}-${DD}`;
    case "DD MMM YYYY":
      return `${DD} ${MMM} ${YYYY}`;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
