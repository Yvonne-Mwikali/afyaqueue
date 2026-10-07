import type { Appointment } from "@/features/appointments/appointment";

import { MOCK_HOSPITAL_ID } from "./hospitals";

/**
 * Static appointments for My Appointments, relative to now so "Today's Visit"
 * always has content. Replace with the appointments repository once the
 * backend boundary exists.
 */
function at(dayOffset: number, hour: number, minute = 0, now = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Today, `minutes` from now, rounded down to the half hour. */
function todayIn(minutes: number, now = new Date()): Date {
  const date = new Date(now.getTime() + minutes * 60_000);
  date.setMinutes(date.getMinutes() < 30 ? 0 : 30, 0, 0);
  return date;
}

const TODAY_VISIT = "visit-today";

export function appointmentsMock(): Appointment[] {
  return [
    // Today's Visit: three appointments in one hospital Visit (rule 6).
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-oncology-today",
      visitId: TODAY_VISIT,
      serviceId: "oncology",
      doctorId: "njeri-mwangi",
      scheduledAt: todayIn(-30),
      status: "checked-in",
    },
    {
      // Held because the oncology session ran over: a hospital-caused delay,
      // not patient lateness (rules 12–13).
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-lab-today",
      visitId: TODAY_VISIT,
      serviceId: "laboratory",
      doctorId: "ruth-njoki",
      scheduledAt: todayIn(60),
      status: "delayed",
    },
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-dental-today",
      visitId: TODAY_VISIT,
      serviceId: "dental",
      doctorId: "samuel-okoye",
      scheduledAt: todayIn(150),
      status: "booked",
    },
    // Upcoming on later days.
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-oncology-followup",
      visitId: "visit-followup",
      serviceId: "oncology",
      doctorId: "njeri-mwangi",
      scheduledAt: at(21, 11),
      status: "booked",
    },
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-pediatrics",
      visitId: "visit-pediatrics",
      serviceId: "pediatrics",
      scheduledAt: at(35, 9),
      status: "booked",
    },
    // History.
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-general-past",
      visitId: "visit-past-1",
      serviceId: "general-care",
      doctorId: "grace-wanjiru",
      scheduledAt: at(-40, 10, 30),
      status: "completed",
    },
    {
      hospitalId: MOCK_HOSPITAL_ID,
      id: "apt-dermatology-cancelled",
      visitId: "visit-past-2",
      serviceId: "dermatology",
      doctorId: "lucy-mutua",
      scheduledAt: at(-12, 14),
      status: "cancelled",
    },
  ];
}
