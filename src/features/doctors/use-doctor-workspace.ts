import { useEffect, useState } from "react";

import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { scheduleRepository } from "@/lib/backend";

import type { Doctor } from "./doctor";
import type { AbsenceKind } from "./schedule";
import type { DoctorAvailability } from "./schedule-repository";
import { useDoctors } from "./use-doctors";

/**
 * The signed-in doctor: auth uid → hospital membership → doctorId → doctor
 * record. `doctor` is null while loading or if the record is missing.
 */
export function useDoctorIdentity(): {
  hospitalId: string | null;
  doctorId: string | null;
  doctor: Doctor | null;
} {
  const { workspace } = useHospitalContext();
  const { doctors } = useDoctors();
  const doctorId = workspace?.role === "doctor" ? workspace.doctorId : null;
  return {
    hospitalId: workspace?.hospitalId ?? null,
    doctorId,
    doctor: doctors.find((item) => item.id === doctorId) ?? null,
  };
}

type ScheduleState = {
  status: "loading" | "ready" | "error";
  availability: DoctorAvailability;
};

const EMPTY: DoctorAvailability = { schedules: [], absences: [] };

/** The doctor's weekly windows and upcoming absences, live, plus absence actions. */
export function useDoctorSchedule(): ScheduleState & {
  addAbsence: (day: Date, kind: AbsenceKind) => Promise<void>;
  removeAbsence: (absenceId: string) => Promise<void>;
} {
  const { hospitalId, doctorId } = useDoctorIdentity();
  const [state, setState] = useState<ScheduleState>({ status: "loading", availability: EMPTY });

  useEffect(() => {
    if (!hospitalId || !doctorId) return;
    return scheduleRepository.watchForDoctor(
      hospitalId,
      doctorId,
      (availability) => setState({ status: "ready", availability }),
      () => setState((current) => ({ ...current, status: "error" }))
    );
  }, [hospitalId, doctorId]);

  return {
    ...state,
    // Whole-day absences: local midnight to the next midnight.
    addAbsence: (day, kind) => {
      if (!hospitalId || !doctorId) return Promise.reject(new Error("No doctor workspace."));
      const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const endAt = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      return scheduleRepository.addAbsence({ hospitalId, doctorId, startAt, endAt, kind });
    },
    removeAbsence: (absenceId) => scheduleRepository.removeAbsence(absenceId),
  };
}
