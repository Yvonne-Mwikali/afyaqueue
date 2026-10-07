import { AppError } from "@/lib/app-error";

import type { AdminRepository } from "./admin";

const unavailable = (): Promise<never> =>
  Promise.reject(new AppError("Admin tools need Firebase to be configured."));
const empty =
  <T>(value: T) =>
  (_h: unknown, onChange: (v: T) => void): (() => void) => {
    onChange(value);
    return () => undefined;
  };

/** Mock mode has no hospital admins. */
export const unavailableAdminRepository: AdminRepository = {
  watchInvites: empty([]),
  invite: unavailable,
  revokeInvite: unavailable,
  createDoctor: unavailable,
  watchMembers: empty([]),
  updateMember: unavailable,
  watchDoctors: empty([]),
  saveDoctor: unavailable,
  linkDoctorAccount: unavailable,
  unlinkDoctorAccount: unavailable,
  watchServices: empty([]),
  saveService: unavailable,
  watchLinks: empty([]),
  setLink: unavailable,
  watchSchedule: (_h, _d, onChange) => {
    onChange([]);
    return () => undefined;
  },
  saveSchedule: unavailable,
  watchHospital: (_h, _onChange, onError) => {
    onError(new AppError("Admin tools need Firebase."));
    return () => undefined;
  },
  updateHospital: unavailable,
  watchAudit: (_h, _since, onChange) => {
    onChange([]);
    return () => undefined;
  },
};
