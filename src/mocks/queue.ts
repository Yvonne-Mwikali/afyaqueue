import type { Appointment } from "@/features/appointments/appointment";
import { type QueueEntry, queueKeyFor } from "@/features/queues/queue-entry";

/**
 * Queue state for sample appointments that are already checked in when the
 * app starts, keyed by appointment id. Entries only ever exist after
 * check-in; a patient can hold several in one Visit (more are added by
 * checking in, e.g. to today's Dental). Replace with the queues repository
 * and its real-time feed.
 */
type QueueSeed = Omit<QueueEntry, "id" | "appointmentId" | "queueKey" | "hospitalId">;

const QUEUE_SEED: Record<string, QueueSeed> = {
  "apt-oncology-today": {
    queueNumber: 14,
    status: "waiting",
    nowServing: 10,
    scheduledPriority: true,
    peopleAhead: 4,
    estimatedWaitMinutes: 25,
  },
  // Later service in the same Visit, held while oncology runs over (rule 13).
  "apt-lab-today": {
    queueNumber: 6,
    status: "on-hold",
    nowServing: 4,
    scheduledPriority: true,
    peopleAhead: 1,
    estimatedWaitMinutes: 15,
  },
};

export function queueEntriesMock(appointments: readonly Appointment[]): QueueEntry[] {
  return appointments.flatMap((appointment): QueueEntry[] => {
    const seed = QUEUE_SEED[appointment.id];
    return seed
      ? [
          {
            id: `queue-${appointment.id}`,
            hospitalId: appointment.hospitalId,
            appointmentId: appointment.id,
            queueKey: queueKeyFor(appointment.serviceId, appointment.scheduledAt),
            ...seed,
          },
        ]
      : [];
  });
}
