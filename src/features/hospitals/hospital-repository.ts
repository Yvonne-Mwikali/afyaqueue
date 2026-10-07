import type { Hospital, HospitalInvite, HospitalMembership } from "./hospital";

export interface HospitalRepository {
  /** Active hospitals patients can choose from. */
  listActive(): Promise<Hospital[]>;
  /** The user's active memberships (staff/doctor/admin), live. */
  watchMemberships(
    userId: string,
    onChange: (memberships: HospitalMembership[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /**
   * Records that a patient uses this hospital (hospitalPatients). Rules
   * only let patients read and book at hospitals they've joined.
   */
  joinAsPatient(hospitalId: string, userId: string): Promise<void>;
  /** Pending invitations for this email, live. */
  watchMyInvites(
    email: string,
    onChange: (invites: HospitalInvite[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  /**
   * Accepts an invitation (verified email required): marks it accepted,
   * creates the membership it describes and, for a doctor, links the
   * doctor record, all in one batch the rules check.
   */
  claimInvite(
    invite: HospitalInvite,
    user: { id: string; displayName: string; email: string }
  ): Promise<void>;
}
