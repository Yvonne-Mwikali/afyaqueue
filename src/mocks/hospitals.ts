import type { HospitalRepository } from "@/features/hospitals/hospital-repository";

/** Mock mode: one hospital, no staff memberships (everyone is a patient). */
export const MOCK_HOSPITAL_ID = "afyacare-hospital";

const MOCK_HOSPITAL = { id: MOCK_HOSPITAL_ID, name: "AfyaCare Hospital" };

export const mockHospitalRepository: HospitalRepository = {
  listActive: () => Promise.resolve([MOCK_HOSPITAL]),
  watchHospital: (hospitalId, onChange) => {
    onChange(hospitalId === MOCK_HOSPITAL_ID ? MOCK_HOSPITAL : null);
    return () => undefined;
  },
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
