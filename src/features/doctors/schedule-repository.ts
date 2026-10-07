import type { AbsenceKind, DoctorAbsence, ScheduleWindow } from "./schedule";

export type DoctorAvailability = {
  schedules: ScheduleWindow[];
  /** Absences that haven't ended yet. */
  absences: DoctorAbsence[];
};

export interface ScheduleRepository {
  /** All active windows and upcoming absences in a hospital (booking availability). */
  loadForHospital(hospitalId: string): Promise<DoctorAvailability>;
  /** One doctor's windows and upcoming absences, live (doctor Schedule screen). */
  watchForDoctor(
    hospitalId: string,
    doctorId: string,
    onChange: (availability: DoctorAvailability) => void,
    onError: (error: unknown) => void
  ): () => void;
  addAbsence(absence: {
    hospitalId: string;
    doctorId: string;
    startAt: Date;
    endAt: Date;
    kind: AbsenceKind;
  }): Promise<void>;
  removeAbsence(absenceId: string): Promise<void>;
}
