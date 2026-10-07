import type { HospitalInvite } from "@/features/hospitals/hospital";

import type { AdminDoctor } from "./admin";

export type AccountStatus =
  { kind: "linked" } | { kind: "pending"; invite: HospitalInvite } | { kind: "none" };

/** Not invited / Invite pending / Linked, for a doctor record. */
export function accountStatus(
  doctor: AdminDoctor,
  invites: readonly HospitalInvite[]
): AccountStatus {
  if (doctor.userId) return { kind: "linked" };
  const invite = invites.find((i) => i.doctorId === doctor.id && i.status === "pending");
  return invite ? { kind: "pending", invite } : { kind: "none" };
}

export const ACCOUNT_LABEL = {
  linked: "Linked",
  pending: "Invite pending",
  none: "Not invited",
} as const;
