import type { Appointment } from "@/features/appointments/appointment";

/** All reminder identifiers start with this, so sync never touches other alerts. */
export const REMINDER_PREFIX = "appt-";

const HOUR = 60 * 60_000;

export type PlannedReminder = {
  /** "appt-{appointmentId}-{24h|1h}-{scheduledAt ms}": a moved appointment gets new ids. */
  id: string;
  at: Date;
  title: string;
  body: string;
  appointmentId: string;
};

export type ReminderNames = {
  serviceName: (appointment: Appointment) => string | undefined;
  hospitalName: (appointment: Appointment) => string | undefined;
};

function timeOf(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Reminders 24 hours and 1 hour before each booked, future appointment.
 * A reminder whose time already passed is skipped (booking 30 minutes
 * ahead gets no reminder). Cancelled, completed or checked-in visits get none.
 */
export function planReminders(
  appointments: readonly Appointment[],
  names: ReminderNames,
  now: Date
): PlannedReminder[] {
  return appointments.flatMap((appointment) => {
    if (appointment.status !== "booked") return [];
    const service = names.serviceName(appointment) ?? "Your";
    const hospital = names.hospitalName(appointment);
    const where = hospital ? ` at ${hospital}` : "";
    const time = timeOf(appointment.scheduledAt);
    const stamp = appointment.scheduledAt.getTime();
    const plan = [
      {
        key: "24h",
        at: new Date(stamp - 24 * HOUR),
        title: "Appointment tomorrow",
        body: `${service} appointment${where} tomorrow at ${time}.`,
      },
      {
        key: "1h",
        at: new Date(stamp - HOUR),
        title: "Appointment in 1 hour",
        body: `${service} appointment${where} at ${time}. Check in when you arrive.`,
      },
    ];
    return plan
      .filter((reminder) => reminder.at.getTime() > now.getTime())
      .map((reminder) => ({
        id: `${REMINDER_PREFIX}${appointment.id}-${reminder.key}-${stamp}`,
        at: reminder.at,
        title: reminder.title,
        body: reminder.body,
        appointmentId: appointment.id,
      }));
  });
}

/** What to cancel and what to add so the phone holds exactly `wanted`. */
export function reminderChanges(
  scheduled: readonly string[],
  wanted: readonly PlannedReminder[]
): { cancel: string[]; add: PlannedReminder[] } {
  const wantedIds = new Set(wanted.map((reminder) => reminder.id));
  const have = new Set(scheduled);
  return {
    cancel: scheduled.filter((id) => id.startsWith(REMINDER_PREFIX) && !wantedIds.has(id)),
    add: wanted.filter((reminder) => !have.has(reminder.id)),
  };
}
