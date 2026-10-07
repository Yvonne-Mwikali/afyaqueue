import type { ScheduleRepository } from "@/features/doctors/schedule-repository";
import { AppError } from "@/lib/app-error";

/** Mock mode has no doctor accounts or schedules. */
export const mockScheduleRepository: ScheduleRepository = {
  loadForHospital: () => Promise.resolve({ schedules: [], absences: [] }),
  watchForDoctor: (_h, _d, onChange) => {
    onChange({ schedules: [], absences: [] });
    return () => undefined;
  },
  addAbsence: () => Promise.reject(new AppError("Schedules need Firebase to be configured.")),
  removeAbsence: () => Promise.reject(new AppError("Schedules need Firebase to be configured.")),
};
