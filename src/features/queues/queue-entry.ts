import type { StatusTone } from "@/features/appointments/appointment";

/**
 * QueueEntry: a Patient's active position within a Queue, created at
 * Check-in (never at booking). Queue numbers are scoped to one Queue on one
 * day, not global (rule 17). Operational states are set by staff/system,
 * never by the patient (rules 15–16).
 */
export type QueueEntryStatus =
  | "waiting"
  /** Next to be called. */
  | "next"
  | "called"
  | "in-service"
  /**
   * Held because the patient is still in another service in the same Visit
   * (rule 13). Not lateness; the place is kept.
   */
  | "on-hold"
  /** The clinic is running late (hospital-caused delay, rule 12). */
  | "delayed"
  /**
   * Called but not there: staff/doctor put the place on hold and carry on.
   * Same number; resuming returns them to "waiting" to be called again.
   * (Different from "on-hold", which means busy in another service.)
   */
  | "held"
  | "completed"
  /** Called and never came. Terminal; leaves the active queue. */
  | "no-show";

export type QueueEntry = {
  id: string;
  hospitalId: string;
  appointmentId: string;
  /** Identifies the Queue: one Service on one day. */
  queueKey: string;
  queueNumber: number;
  status: QueueEntryStatus;
  /** Number currently being served in this queue. */
  nowServing: number;
  /** True when checked in by the scheduled time (rules 10–11). */
  scheduledPriority: boolean;
  peopleAhead: number;
  /** Approximate; always shown with "~". */
  estimatedWaitMinutes: number;
  /** How many times the patient has been called (Call Again increments). */
  callCount?: number;
  lastCalledAt?: Date;
};

/** Queue key for a service on a given day. */
export function queueKeyFor(serviceId: string, day: Date): string {
  return `${serviceId}:${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** Patient-facing label, tone and one short message per queue status. */
export function queueStatusPresentation(entry: QueueEntry): {
  label: string;
  tone: StatusTone;
  message: string;
} {
  switch (entry.status) {
    case "waiting":
      return {
        label: "Waiting",
        tone: "accent",
        message:
          entry.peopleAhead === 1
            ? "There is 1 patient ahead of you."
            : `There are ${entry.peopleAhead} patients ahead of you.`,
      };
    case "next":
      return { label: "You're next", tone: "accent", message: "You're next. Please be ready." };
    case "called":
      return {
        label: (entry.callCount ?? 1) > 1 ? `Called ${entry.callCount} times` : "Called",
        tone: "success",
        message:
          (entry.callCount ?? 1) > 1
            ? "You've been called again. Please go to the consultation room now."
            : "It's your turn. Please go to the consultation room.",
      };
    case "held":
      return {
        label: "Place held",
        tone: "warning",
        message: "Your queue position is being held. Staff will call you again.",
      };
    case "no-show":
      return {
        label: "Missed",
        tone: "muted",
        message: "You were called but weren't there. Please speak to reception.",
      };
    case "in-service":
      return { label: "In service", tone: "success", message: "You're being seen now." };
    case "on-hold":
      return {
        label: "On hold",
        tone: "warning",
        message: "You're finishing another service. Your place is being held.",
      };
    case "delayed":
      return {
        label: "Clinic running late",
        tone: "warning",
        message: "The clinic is behind schedule. Your place is not affected.",
      };
    case "completed":
      return { label: "Completed", tone: "muted", message: "All done. Thank you for visiting." };
  }
}

/** Entries still in the queue flow (not completed or missed). */
export function activeEntries(entries: readonly QueueEntry[]): QueueEntry[] {
  return entries.filter((entry) => entry.status !== "completed" && entry.status !== "no-show");
}

/** Order for picking the entry that matters most right now. */
const RELEVANCE: QueueEntryStatus[] = [
  "called",
  "next",
  "in-service",
  "held",
  "waiting",
  "delayed",
  "on-hold",
  "completed",
  "no-show",
];

export function mostRelevantEntry(entries: readonly QueueEntry[]): QueueEntry | undefined {
  return [...entries].sort((a, b) => RELEVANCE.indexOf(a.status) - RELEVANCE.indexOf(b.status))[0];
}
