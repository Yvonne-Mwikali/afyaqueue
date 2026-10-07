import { type Appointment, isFinished } from "./appointment";

/**
 * Bookable time for an Appointment. A slot is a scheduled start time on a
 * day; booking reserves it (business rules 7–8). Queue entries are created
 * later, at Check-in, never here.
 */

/** Minutes after midnight, e.g. 600 = 10:00. */
export type SlotStart = number;

export type TimeSlot = {
  start: SlotStart;
  /** False when already reserved (another Appointment holds this time). */
  available: boolean;
};

export type DayAvailability = {
  /** Local midnight of the day. */
  date: Date;
  /** The day's slots, ascending. Empty = closed. */
  slots: TimeSlot[];
};

/** True when the day has at least one bookable slot. */
export function hasAvailability(day: DayAvailability): boolean {
  return day.slots.some((slot) => slot.available);
}

/** The Date for a slot on a given day. */
export function slotDate(day: Date, start: SlotStart): Date {
  const date = new Date(day);
  date.setHours(Math.floor(start / 60), start % 60, 0, 0);
  return date;
}

/** First day that has at least one free slot, if any. */
export function firstAvailableDay(days: readonly DayAvailability[]): DayAvailability | undefined {
  return days.find(hasAvailability);
}

/**
 * Where bookable slots come from: the clinic template, minus the patient's
 * own clashes and (Firebase) the doctor's locked blocks. The guarantee
 * against double-booking is the slot locks themselves (slot-locks.ts),
 * enforced by Firestore rules; availability is only a helpful preview.
 */
export interface AvailabilitySource {
  daysFor(request: AvailabilityRequest): Promise<DayAvailability[]>;
}

export type AvailabilityRequest = {
  hospitalId: string;
  /** null = Any Available Doctor. */
  doctorId: string | null;
  /** Active doctors linked to the service (who "any" could be). */
  serviceDoctorIds: readonly string[];
  serviceId: string;
  durationMinutes: number;
  /** The signed-in patient's own appointments (safe to read). */
  patientAppointments: readonly Appointment[];
  days?: number;
  now?: Date;
};

/** Clinic day template: 8:00–13:30 every 30 minutes, plus two afternoon slots. */
export const CLINIC_SLOTS: readonly SlotStart[] = [
  8 * 60,
  8 * 60 + 30,
  9 * 60,
  10 * 60,
  10 * 60 + 30,
  11 * 60,
  11 * 60 + 30,
  13 * 60,
  13 * 60 + 30,
  14 * 60 + 30,
  15 * 60,
];

/** Bookable lead time: today's slots within the next hour aren't offered. */
const LEAD_MINUTES = 60;

/** Candidate days from the template: Sundays closed, past/imminent slots dropped. */
export function clinicDays(days = 14, now = new Date()): DayAvailability[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const earliest = now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES;
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (date.getDay() === 0) return { date, slots: [] };
    const slots = CLINIC_SLOTS.filter((start) => offset > 0 || start >= earliest).map((start) => ({
      start,
      available: true,
    }));
    return { date, slots };
  });
}

/** Marks slots that overlap one of the patient's open appointments as unavailable (rule 7). */
export function withoutPatientClashes(
  days: DayAvailability[],
  appointments: readonly Appointment[],
  durationMinutes: number,
  fallbackMinutes = durationMinutes
): DayAvailability[] {
  const open = appointments.filter((appointment) => !isFinished(appointment));
  return days.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => {
      const start = slotDate(day.date, slot.start).getTime();
      const end = start + durationMinutes * 60_000;
      const clash = open.some((appointment) => {
        const aStart = appointment.scheduledAt.getTime();
        const aEnd = aStart + (appointment.durationMinutes ?? fallbackMinutes) * 60_000;
        return start < aEnd && aStart < end;
      });
      return clash ? { ...slot, available: false } : slot;
    }),
  }));
}
