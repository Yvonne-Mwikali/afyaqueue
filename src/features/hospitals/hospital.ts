/** A hospital using AfyaQueue. Every operational record carries its id. */
export type Hospital = {
  id: string;
  name: string;
  shortName?: string;
  /** Free text such as "Ngong Road, Nairobi". */
  location?: string;
};

/** Hospital-level roles (patients are not members; see HospitalPatient). */
export type MemberRole = "staff" | "doctor" | "admin";

/** hospitalMembers/{hospitalId}_{userId}: what a user may do at one hospital. */
export type HospitalMembership = {
  hospitalId: string;
  userId: string;
  role: MemberRole;
  /** Set for doctors: the doctors/{doctorId} record this account operates. */
  doctorId: string | null;
};

/**
 * hospitalInvites/{hospitalId}_{email}: an admin's invitation. Claimed by
 * the person signing in with that (verified) email; it then becomes their
 * membership. The role and doctor record come from the invite.
 */
export type HospitalInvite = {
  id: string;
  hospitalId: string;
  email: string;
  role: MemberRole;
  doctorId: string | null;
  /** For display: recipients can't read doctor records before joining. */
  doctorName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: Date | null;
};

/** Emails are compared trimmed and lower-cased everywhere (Firebase does too). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteId(hospitalId: string, email: string): string {
  return `${hospitalId}_${normalizeEmail(email)}`;
}

/** Which app a membership opens. Admins use the staff workspace for now. */
export function workspaceFor(role: MemberRole): "staff" | "doctor" {
  return role === "doctor" ? "doctor" : "staff";
}

/** Saved workspace key: "patient" or "{role}:{hospitalId}" (e.g. "doctor:afyacare-hospital"). */
export function membershipKey(membership: Pick<HospitalMembership, "hospitalId" | "role">): string {
  return `${membership.role}:${membership.hospitalId}`;
}

export const PATIENT_WORKSPACE = "patient";

/**
 * Which workspace to open: the saved one if it's still valid (patient is
 * always valid; a membership only while active), patient when there's
 * nothing else, otherwise null = ask. Never guesses between professions.
 */
export function resolveWorkspace(
  memberships: readonly HospitalMembership[],
  saved: string | null
): { mode: "patient" } | { mode: "member"; membership: HospitalMembership } | null {
  if (memberships.length === 0 || saved === PATIENT_WORKSPACE) return { mode: "patient" };
  const membership = memberships.find((m) => membershipKey(m) === saved);
  return membership ? { mode: "member", membership } : null;
}
