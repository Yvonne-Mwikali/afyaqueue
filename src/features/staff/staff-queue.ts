import type { MemberRole } from "@/features/hospitals/hospital";
import type { HoldReason, QueueAction } from "@/features/queues/queue-actions";
import type { QueueEntryStatus } from "@/features/queues/queue-entry";
import type { OrderableEntry } from "@/features/queues/queue-order";

/** One service's queue for one day, as staff see it. */
export type StaffQueue = {
  id: string;
  serviceId: string;
  date: string;
  nowServing: number;
  lastNumber: number;
  status: "open" | "paused" | "closed";
};

/**
 * A queue entry with just enough context to operate it: the patient's
 * display name only (no contact details), appointment time and doctor.
 */
export type StaffQueueEntry = OrderableEntry & {
  id: string;
  appointmentId: string;
  queueId: string;
  serviceId: string;
  status: QueueEntryStatus;
  patientName: string;
  doctorId: string | null;
  callCount: number;
  lastCalledAt: Date | null;
  /** For the Undo Start correction window. */
  serviceStartedAt: Date | null;
};

/**
 * One of today's appointments as staff see it: operational fields only.
 * Never includes contact details, date of birth or other appointments.
 */
export type StaffVisit = {
  appointmentId: string;
  patientName: string;
  serviceId: string;
  doctorId: string | null;
  scheduledAt: Date | null;
  /** Appointment status (booked, checked-in, completed, ...). */
  status: string;
};

export interface StaffQueueRepository {
  /** Today's appointments across services, live (cancelled ones excluded). */
  watchVisits(
    hospitalId: string,
    date: string,
    onChange: (visits: StaffVisit[]) => void,
    onError: (error: unknown) => void,
    /** Only this doctor's appointments (doctor workspace). */
    doctorId?: string
  ): () => void;
  /** Today's queues (one per service with at least one check-in). */
  watchQueues(
    hospitalId: string,
    date: string,
    onChange: (queues: StaffQueue[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /** Live entries of the given queues. */
  watchEntries(
    hospitalId: string,
    queueIds: readonly string[],
    onChange: (entries: StaffQueueEntry[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /** A doctor's queue entries since a time (today), live. */
  watchDoctorEntries(
    hospitalId: string,
    doctorId: string,
    since: Date,
    onChange: (entries: StaffQueueEntry[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /**
   * Calls the next waiting patient, given the staff screen's call order.
   * Concurrency-safe: skips entries another staff member already called.
   * Returns the called entry id, or null when nobody is waiting.
   */
  callNext(
    queueId: string,
    candidates: readonly string[],
    role: MemberRole
  ): Promise<string | null>;
  /**
   * Any other single-step action (Call Again, Hold, Resume, Start, Undo
   * Start, Complete, No Show), in a transaction with its audit event.
   */
  perform(
    entryId: string,
    action: Exclude<QueueAction, "call">,
    role: MemberRole,
    holdReason?: HoldReason
  ): Promise<void>;
}
