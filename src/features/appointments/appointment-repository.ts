import type { Appointment } from "./appointment";
import type { NewAppointment } from "./booking";

/** A patient's appointments. Booking never creates a queue entry (rule 9). */
export interface AppointmentRepository {
  /**
   * Streams the patient's appointments (all statuses), now and on every
   * change. Returns an unsubscribe function.
   */
  watchForPatient(
    patientId: string,
    onChange: (appointments: Appointment[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /** Creates a "booked" appointment; returns its id. */
  book(appointment: NewAppointment): Promise<string>;
  /** Patient cancellation of a booked appointment (rule 14). */
  cancel(appointmentId: string): Promise<void>;
}
