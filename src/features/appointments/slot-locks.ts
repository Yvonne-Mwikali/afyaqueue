/**
 * Slot locks: how booking stays conflict-free without server code.
 *
 * Each booking writes, in one batch with the appointment:
 * - doctor locks: doctorSlots/{doctorId}_{blockStartMillis}, one per
 *   15-minute block the appointment covers (rule 8: no overlapping
 *   bookings for a doctor), and
 * - a patient lock: patientSlots/{patientId}_{startMillis} (rule 7: no
 *   two appointments at the same time).
 *
 * Firestore rules only allow creating a lock that doesn't exist yet, and
 * only together with its appointment, so a second booking of a taken block
 * fails as a whole, even when two patients book at the same instant.
 * Any Available Doctor bookings take no doctor lock (no doctor yet).
 *
 * Keep in sync with firestore.rules (SLOT_BLOCK, blockCount).
 */
export const SLOT_BLOCK_MINUTES = 15;
const BLOCK_MS = SLOT_BLOCK_MINUTES * 60_000;

/** True when a start time sits on the 15-minute grid (rules require it). */
export function isOnSlotGrid(start: Date): boolean {
  return start.getTime() % BLOCK_MS === 0;
}

/** Start (ms) of every 15-minute block an appointment covers. */
export function blockStarts(start: Date, durationMinutes: number): number[] {
  const count = Math.ceil(durationMinutes / SLOT_BLOCK_MINUTES);
  return Array.from({ length: count }, (_, index) => start.getTime() + index * BLOCK_MS);
}

export function doctorLockId(doctorId: string, blockStartMs: number): string {
  return `${doctorId}_${blockStartMs}`;
}

export function patientLockId(patientId: string, startMs: number): string {
  return `${patientId}_${startMs}`;
}
