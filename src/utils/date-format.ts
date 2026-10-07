/**
 * Presentation formatting for dates and times. Uses the device locale so
 * 12/24-hour time and day/month order follow the patient's settings.
 */

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Tomorrow", or a short weekday such as "Fri". */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const days = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

/** e.g. "Wed, 1 Oct" (order depends on locale). */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** e.g. "Tue, 15 Apr 2025". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "April 2025". */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Parts for a compact date card: "Tue", "15", "Apr". */
export function dateCardParts(date: Date): { weekday: string; day: string; month: string } {
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: "short" }),
  };
}

/** True when both dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** e.g. "10:30 AM" or "10:30" depending on locale. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** Short distance to a future time: "In 45 min", "In 2 hours", "Tomorrow", "In 3 days", "In 3 weeks". */
export function formatTimeUntil(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (minutes < 60) return minutes <= 0 ? "Now" : `In ${minutes} min`;
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  if (days === 0) {
    const hours = Math.round(minutes / 60);
    return `In ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}
