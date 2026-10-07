/**
 * A healthcare professional who provides one or more Services (see
 * GLOSSARY.md: Doctor, DoctorService).
 */
export type Doctor = {
  id: string;
  name: string;
  /** Specialty or title shown under the name, e.g. "Consultant Oncologist". */
  title: string;
  initials: string;
  rating: number;
  reviewCount: number;
  facility: string;
  /** DoctorService: the services this doctor provides. */
  serviceIds: string[];
};

/** Patient's doctor choice for an Appointment: a specific doctor or Any Available Doctor. */
export type DoctorChoice = { kind: "any" } | { kind: "doctor"; doctorId: string };

export const ANY_AVAILABLE_DOCTOR_ID = "any";

/** Doctors who provide the given service. */
export function doctorsForService(doctors: readonly Doctor[], serviceId: string): Doctor[] {
  return doctors.filter((doctor) => doctor.serviceIds.includes(serviceId));
}
