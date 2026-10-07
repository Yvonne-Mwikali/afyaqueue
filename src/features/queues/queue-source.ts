import type { QueueEntry } from "./queue-entry";

/**
 * The patient's queue entries and check-in. Entries exist only after
 * check-in (rule 9); the patient never chooses a queue number, position or
 * operational status (rules 15–16).
 */
export interface QueueSource {
  /** Streams the patient's queue entries with live queue progress. */
  watchForPatient(
    patientId: string,
    onChange: (entries: QueueEntry[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /** Checks in to a booked appointment; throws AppError when it can't. */
  checkIn(appointmentId: string, patientId: string): Promise<QueueEntry>;
}
