import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";

import { firestoreScheduleRepository } from "@/features/doctors/firestore-schedule-repository";
import { isAbsent, scheduledStarts } from "@/features/doctors/schedule";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import {
  type AvailabilitySource,
  type DayAvailability,
  slotDate,
  withoutPatientClashes,
} from "./availability";
import { blockStarts } from "./slot-locks";

const DAYS_AHEAD = 14;
/** Today's slots within the next hour aren't offered. */
const LEAD_MS = 60 * 60_000;

/**
 * Bookable times from real availability (docs/firebase-data-model.md):
 * - a specific doctor: their weekly windows, minus absences, minus their
 *   locked 15-minute blocks (doctorSlots: busy times, no patient details);
 * - Any Available Doctor: times when at least one doctor linked to the
 *   service is scheduled and not absent (no assignment yet, no locks).
 * Always minus the patient's own clashes. Rules still enforce the locks;
 * schedules/absences are a booking-time preview, not a server guarantee.
 */
export const firestoreAvailabilitySource: AvailabilitySource = {
  daysFor: async ({
    hospitalId,
    doctorId,
    serviceDoctorIds,
    durationMinutes,
    patientAppointments,
    days = DAYS_AHEAD,
    now = new Date(),
  }) => {
    const { schedules, absences } = await firestoreScheduleRepository.loadForHospital(hospitalId);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const doctorIds = doctorId ? [doctorId] : [...serviceDoctorIds];

    const candidates: DayAvailability[] = Array.from({ length: days }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      // A start is offered when some candidate doctor is scheduled and present for the whole visit.
      const starts = new Set<number>();
      for (const id of doctorIds) {
        for (const start of scheduledStarts(schedules, id, date, durationMinutes)) {
          const at = slotDate(date, start);
          const end = new Date(at.getTime() + durationMinutes * 60_000);
          if (at.getTime() < now.getTime() + LEAD_MS) continue;
          if (!isAbsent(absences, id, at, end)) starts.add(start);
        }
      }
      return {
        date,
        slots: [...starts].sort((a, b) => a - b).map((start) => ({ start, available: true })),
      };
    });
    const withoutClashes = withoutPatientClashes(candidates, patientAppointments, durationMinutes);
    if (!doctorId) return withoutClashes;

    const from = today;
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    const locks = await getDocs(
      query(
        collection(firestore(), COLLECTIONS.doctorSlots),
        where("hospitalId", "==", hospitalId),
        where("doctorId", "==", doctorId),
        where("startAt", ">=", Timestamp.fromDate(from)),
        where("startAt", "<", Timestamp.fromDate(to))
      )
    );
    const taken = new Set(
      locks.docs.flatMap((lock) => {
        const startAt = lock.get("startAt");
        return startAt instanceof Timestamp ? [startAt.toMillis()] : [];
      })
    );
    return withoutClashes.map((day) => ({
      ...day,
      slots: day.slots.map((slot) =>
        blockStarts(slotDate(day.date, slot.start), durationMinutes).some((block) =>
          taken.has(block)
        )
          ? { ...slot, available: false }
          : slot
      ),
    }));
  },
};
