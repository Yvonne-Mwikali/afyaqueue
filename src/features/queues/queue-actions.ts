import type { QueueEntryStatus } from "./queue-entry";

/**
 * Staff/doctor queue actions and the only transitions allowed (enforced
 * again by firestore.rules):
 *
 *   waiting    → called       call        (Call / Call Next)
 *   called     → called       call-again  (count + time only)
 *   called     → held         hold        (place kept, same number)
 *   held       → waiting      resume      (then called again, in order)
 *   called     → in-service   start
 *   in-service → called       undo-start  (within UNDO_START_WINDOW_MS)
 *   in-service → completed    complete    (also completes the appointment)
 *   called     → no-show      no-show     (terminal; appointment → no-show)
 *
 * Nothing else: no arbitrary backward moves, no undo for completed or
 * no-show, and queue numbers never change.
 */
export type QueueAction =
  "call" | "call-again" | "hold" | "resume" | "start" | "undo-start" | "complete" | "no-show";

export const TRANSITIONS: Record<QueueAction, { from: QueueEntryStatus; to: QueueEntryStatus }> = {
  call: { from: "waiting", to: "called" },
  "call-again": { from: "called", to: "called" },
  hold: { from: "called", to: "held" },
  resume: { from: "held", to: "waiting" },
  start: { from: "called", to: "in-service" },
  "undo-start": { from: "in-service", to: "called" },
  complete: { from: "in-service", to: "completed" },
  "no-show": { from: "called", to: "no-show" },
};

/** Undo Start is a correction for a mis-tap, not a way to rewind a visit. */
export const UNDO_START_WINDOW_MS = 2 * 60_000;

export const ACTION_LABELS: Record<QueueAction, string> = {
  call: "Call",
  "call-again": "Call Again",
  hold: "Put on Hold",
  resume: "Resume",
  start: "Start Service",
  "undo-start": "Undo Start",
  complete: "Complete",
  "no-show": "No Show",
};

/** Optional, controlled reason for a hold (no free text). */
export type HoldReason = "not-present" | "stepped-out" | "other";

/**
 * Actions for one entry: one primary (shown on the row) and the rest in a
 * menu. Undo Start appears only inside its correction window.
 */
export function actionsFor(
  entry: { status: QueueEntryStatus; serviceStartedAt?: Date | null },
  now: Date
): { primary: QueueAction | null; secondary: QueueAction[] } {
  switch (entry.status) {
    case "waiting":
      return { primary: "call", secondary: [] };
    case "called":
      return { primary: "start", secondary: ["call-again", "hold", "no-show"] };
    case "held":
      return { primary: "resume", secondary: [] };
    case "in-service": {
      const startedAt = entry.serviceStartedAt?.getTime() ?? 0;
      const canUndo = now.getTime() - startedAt < UNDO_START_WINDOW_MS;
      return { primary: "complete", secondary: canUndo ? ["undo-start"] : [] };
    }
    default:
      return { primary: null, secondary: [] };
  }
}
