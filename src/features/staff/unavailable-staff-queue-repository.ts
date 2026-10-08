import { AppError } from "@/lib/app-error";

import type { StaffQueueRepository } from "./staff-queue";

const unavailable = (): Promise<never> =>
  Promise.reject(new AppError("Staff queue tools need Firebase to be configured."));

/** Mock mode has no staff accounts; staff tools need Firebase. */
export const unavailableStaffQueueRepository: StaffQueueRepository = {
  watchVisits: (_hospitalId, _date, onChange) => {
    onChange([]);
    return () => undefined;
  },
  watchQueues: (_hospitalId, _date, onChange) => {
    onChange([]);
    return () => undefined;
  },
  watchEntries: (_hospitalId, _ids, onChange) => {
    onChange([]);
    return () => undefined;
  },
  watchDoctorEntries: (_h, _d, _since, onChange) => {
    onChange([]);
    return () => undefined;
  },
  callNext: unavailable,
  perform: unavailable,
  logCallAttempt: unavailable,
};
