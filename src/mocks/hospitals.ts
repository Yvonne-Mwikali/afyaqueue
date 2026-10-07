import type { HospitalRepository } from "@/features/hospitals/hospital-repository";

/** Mock mode: one hospital, no staff memberships (everyone is a patient). */
export const MOCK_HOSPITAL_ID = "afyacare-hospital";

export const mockHospitalRepository: HospitalRepository = {
  listActive: () => Promise.resolve([{ id: MOCK_HOSPITAL_ID, name: "AfyaCare Hospital" }]),
  watchMemberships: (_userId, onChange) => {
    onChange([]);
    return () => undefined;
  },
  joinAsPatient: () => Promise.resolve(),
  watchMyInvites: (_email, onChange) => {
    onChange([]);
    return () => undefined;
  },
  claimInvite: () => Promise.resolve(),
};
