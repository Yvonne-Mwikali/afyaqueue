import type { SlotStart } from "@/features/appointments/availability";

/**
 * Doctor availability (docs/firebase-data-model.md):
 * - doctorSchedules: recurring weekly windows in the hospital's local time
 *   (several per day allowed, e.g. Mon 08:00–12:00 and 14:00–17:00). No
 *   weekday is special: a day with no window is simply not bookable.
 * - doctorAbsences: whole days off (leave, unavailable, temporary). No
 *   free-text reason: absences are readable by the hospital's patients so
 *   booking can hide those days.
 */
export type ScheduleWindow = {
  id: string;
  hospitalId: string;
  doctorId: string;
  /** 0 = Sunday … 6 = Saturday (JavaScript Date.getDay()). */
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

export type AbsenceKind = "leave" | "unavailable" | "temporary";

export const ABSENCE_KINDS: { id: AbsenceKind; label: string }[] = [
  { id: "leave", label: "Leave" },
  { id: "unavailable", label: "Unavailable" },
  { id: "temporary", label: "Temporary absence" },
];

export type DoctorAbsence = {
  id: string;
  hospitalId: string;
  doctorId: string;
  startAt: Date;
  endAt: Date;
  kind: AbsenceKind;
  /** uid of whoever added it (the doctor or an admin). */
  createdBy: string;
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "08:30" → 510 minutes after midnight; null when malformed. */
export function parseTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Bookable starts are on the half hour inside a window. */
const SLOT_STEP_MINUTES = 30;

/** Start times on `day` for which a whole appointment fits inside one of the doctor's windows. */
export function scheduledStarts(
  windows: readonly ScheduleWindow[],
  doctorId: string,
  day: Date,
  durationMinutes: number
): SlotStart[] {
  const starts = new Set<SlotStart>();
  for (const window of windows) {
    if (window.doctorId !== doctorId || window.dayOfWeek !== day.getDay()) continue;
    const first = Math.ceil(window.startMinutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    for (
      let start = first;
      start + durationMinutes <= window.endMinutes;
      start += SLOT_STEP_MINUTES
    ) {
      starts.add(start);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

/** True when one of the doctor's absences overlaps [start, end). */
export function isAbsent(
  absences: readonly DoctorAbsence[],
  doctorId: string,
  start: Date,
  end: Date
): boolean {
  return absences.some(
    (absence) =>
      absence.doctorId === doctorId &&
      absence.startAt.getTime() < end.getTime() &&
      start.getTime() < absence.endAt.getTime()
  );
}
