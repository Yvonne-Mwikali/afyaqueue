import type { ServiceMode } from "@/features/services/service-catalog";

/**
 * Appointment: a planned reservation for a Patient to receive a Service at a
 * scheduled time, optionally with a specific Doctor (see GLOSSARY.md).
 * Appointments on the same day belong to one Visit.
 */
export type AppointmentStatus =
  /** Reserved; the patient has not checked in yet. Patient may cancel/reschedule. */
  | "booked"
  /** Patient confirmed arrival (Check-in); a QueueEntry exists. */
  | "checked-in"
  /** In the queue, waiting to be called. */
  | "waiting"
  /** Held because of a Hospital-caused Delay (never patient lateness). */
  | "delayed"
  | "completed"
  /** Withdrawn by the patient; never part of an active queue. */
  | "cancelled"
  /** Checked in and called, but never came (staff/doctor marked no-show). */
  | "no-show";

export type Appointment = {
  id: string;
  /** The hospital this appointment belongs to (every operational record has one). */
  hospitalId: string;
  /** Appointments sharing a visitId are one hospital Visit. */
  visitId: string;
  serviceId: string;
  /** Absent when the patient chose Any Available Doctor. */
  doctorId?: string;
  scheduledAt: Date;
  /** Booked length; falls back to the service's default when absent. */
  durationMinutes?: number;
  /** How the visit happens; in-clinic unless the service is booked online. */
  visitType?: ServiceMode;
  status: AppointmentStatus;
};

/** "YYYY-MM-DD" for the local (hospital) day of a date. */
export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * One Visit per patient per hospital day (rule 6): every appointment that
 * day shares this id, so appointments group without a separate write.
 */
export function visitIdFor(patientId: string, date: Date): string {
  return `${patientId}_${localDateKey(date)}`;
}

/** Visual tone for a status; components map tones to theme colors. */
export type StatusTone = "neutral" | "accent" | "success" | "warning" | "muted";

/** Concise patient-facing label and tone for each status. */
export const STATUS_PRESENTATION: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  booked: { label: "Upcoming", tone: "neutral" },
  "checked-in": { label: "Checked in", tone: "success" },
  waiting: { label: "In queue", tone: "accent" },
  delayed: { label: "Delayed by clinic", tone: "warning" },
  completed: { label: "Completed", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "muted" },
  "no-show": { label: "Missed", tone: "muted" },
};

/**
 * Patients control booking, cancellation and check-in; operational states
 * belong to staff/system (rules 14–15). Only a booked appointment can be
 * cancelled or rescheduled by the patient.
 */
export function canPatientModify(appointment: Appointment): boolean {
  return appointment.status === "booked";
}

/**
 * A patient can check in to a booked appointment on its day. Check-in is
 * what makes them eligible for the active queue (rule 9).
 */
export function canCheckIn(appointment: Appointment, now = new Date()): boolean {
  const scheduled = appointment.scheduledAt;
  return (
    appointment.status === "booked" &&
    scheduled.getFullYear() === now.getFullYear() &&
    scheduled.getMonth() === now.getMonth() &&
    scheduled.getDate() === now.getDate()
  );
}

/**
 * Checking in by the scheduled time keeps scheduled priority; after it, the
 * patient takes the next available queue position (rules 10–11). No grace
 * period. Hospital-caused delays are handled separately and never apply here.
 */
export function keepsScheduledPriority(appointment: Appointment, now = new Date()): boolean {
  return now.getTime() <= appointment.scheduledAt.getTime();
}

/** Statuses that mean the patient is currently in the hospital's queue flow. */
const ACTIVE: AppointmentStatus[] = ["checked-in", "waiting", "delayed"];
const FINISHED: AppointmentStatus[] = ["completed", "cancelled", "no-show"];

export function isActive(appointment: Appointment): boolean {
  return ACTIVE.includes(appointment.status);
}

export function isFinished(appointment: Appointment): boolean {
  return FINISHED.includes(appointment.status);
}

/**
 * The patient's nearest appointment that hasn't finished: still open
 * (not completed/cancelled) and not yet over. Undefined when none.
 */
export function nextAppointment(
  appointments: readonly Appointment[],
  now = new Date()
): Appointment | undefined {
  return [...appointments]
    .filter(
      (a) =>
        !isFinished(a) &&
        a.scheduledAt.getTime() + (a.durationMinutes ?? 0) * 60_000 >= now.getTime()
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
}

/** Groups for the My Appointments tabs. */
export function groupAppointments(appointments: readonly Appointment[], now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const byTime = [...appointments].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
  );
  const isToday = (a: Appointment): boolean =>
    a.scheduledAt.getTime() >= startOfToday && a.scheduledAt.getTime() < startOfTomorrow;

  return {
    /** Today's Visit: everything still open today, in time order. */
    today: byTime.filter((a) => isToday(a) && !isFinished(a)),
    /** Booked appointments on later days. */
    upcoming: byTime.filter(
      (a) => !isToday(a) && a.status === "booked" && a.scheduledAt.getTime() >= startOfTomorrow
    ),
    /** Currently in the queue flow (checked in, waiting, delayed). */
    active: byTime.filter(isActive),
    /** Completed and cancelled, most recent first. */
    history: byTime.filter(isFinished).reverse(),
  };
}
