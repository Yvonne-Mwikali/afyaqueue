import {
  type AvailabilitySource,
  clinicDays,
  withoutPatientClashes,
} from "@/features/appointments/availability";

/** Small stable hash so each doctor gets a consistent, distinct schedule. */
function seedFor(id: string): number {
  return [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

/**
 * Mock mode only: the clinic template where a specific doctor has roughly a
 * third of their slots already reserved (shown as unavailable).
 */
export const mockAvailabilitySource: AvailabilitySource = {
  daysFor: ({ doctorId, durationMinutes, patientAppointments, days, now }) => {
    const seed = doctorId ? seedFor(doctorId) : 0;
    const template = clinicDays(days, now).map((day, offset) => ({
      ...day,
      slots: day.slots.map((slot, index) => ({
        ...slot,
        available: seed === 0 || (seed + offset * 7 + index * 3) % 3 !== 0,
      })),
    }));
    return Promise.resolve(withoutPatientClashes(template, patientAppointments, durationMinutes));
  },
};
