import type { QueueEntryStatus } from "@/features/queues/queue-entry";

import type { StaffQueueEntry, StaffVisit } from "./staff-queue";

/** Where a patient is today: not checked in yet, or their queue status. */
export type RosterStatus = "booked" | QueueEntryStatus;

/** One patient visit today: the appointment plus its queue entry, if any. */
export type RosterRow = StaffVisit & {
  rosterStatus: RosterStatus;
  queueNumber: number | null;
  entry: StaffQueueEntry | null;
};

export type RosterFilter = "all" | "waiting" | "called" | "held" | "in-service" | "completed";

export const ROSTER_FILTERS: { id: RosterFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "called", label: "Called" },
  { id: "held", label: "Held" },
  { id: "in-service", label: "In Service" },
  { id: "completed", label: "Completed" },
];

/** Today's appointments joined to their queue entries (entry id = appointment id). */
export function buildRoster(
  visits: readonly StaffVisit[],
  entries: readonly StaffQueueEntry[]
): RosterRow[] {
  const byAppointment = new Map(entries.map((entry) => [entry.appointmentId, entry]));
  return visits
    .map((visit): RosterRow => {
      const entry = byAppointment.get(visit.appointmentId) ?? null;
      const rosterStatus: RosterStatus =
        entry?.status ??
        (visit.status === "completed"
          ? "completed"
          : visit.status === "no-show"
            ? "no-show"
            : "booked");
      return { ...visit, rosterStatus, queueNumber: entry?.queueNumber ?? null, entry };
    })
    .sort(
      (a, b) =>
        (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0) ||
        a.patientName.localeCompare(b.patientName)
    );
}

/** Filter by status and a case-insensitive name search. */
export function filterRoster(
  rows: readonly RosterRow[],
  filter: RosterFilter,
  query: string
): RosterRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filter === "all" || row.rosterStatus === filter) &&
      (needle === "" || row.patientName.toLowerCase().includes(needle))
  );
}
