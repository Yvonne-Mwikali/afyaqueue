import type { QueueEntryStatus } from "./queue-entry";

/** What staff need to order and operate one queue entry. */
export type OrderableEntry = {
  queueNumber: number;
  status: QueueEntryStatus;
  scheduledPriority: boolean;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
};

/**
 * Operational order (rules 10–11): an on-time patient keeps their place by
 * scheduled time; a late arrival takes the next place from when they
 * checked in. Both are compared on one timeline; ties by queue number.
 */
function orderTime(entry: OrderableEntry): number {
  const at = entry.scheduledPriority ? entry.scheduledAt : entry.checkedInAt;
  return at?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function inQueueOrder<T extends OrderableEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => orderTime(a) - orderTime(b) || a.queueNumber - b.queueNumber);
}

/** Staff may only move an entry one step forward (rules 15–16). */
export const STAFF_TRANSITIONS: Partial<Record<QueueEntryStatus, QueueEntryStatus>> = {
  waiting: "called",
  called: "in-service",
  "in-service": "completed",
};

/** Waiting entries in the order they should be called. */
export function callOrder<T extends OrderableEntry>(entries: readonly T[]): T[] {
  return inQueueOrder(entries.filter((entry) => entry.status === "waiting"));
}
