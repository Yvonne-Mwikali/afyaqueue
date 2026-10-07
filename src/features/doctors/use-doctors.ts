import { createHospitalCache } from "@/features/hospitals/hospital-cache";
import { doctorRepository } from "@/lib/backend";

import type { Doctor } from "./doctor";

const doctorsCache = createHospitalCache<Doctor>((hospitalId) =>
  doctorRepository.listActive(hospitalId)
);

/** The active hospital's active doctors and the services they provide. */
export function useDoctors(): {
  status: "loading" | "ready" | "error";
  doctors: readonly Doctor[];
  retry: () => void;
} {
  const { status, data, retry } = doctorsCache.use();
  return { status, doctors: data, retry };
}

/** A specific hospital's doctors. */
export function useDoctorsFor(hospitalId: string | null): readonly Doctor[] {
  return doctorsCache.useFor(hospitalId).data;
}

/** Doctor lookup across several hospitals (appointments everywhere). */
export function useDoctorsAcross(
  hospitalIds: readonly string[]
): (hospitalId: string, doctorId: string | undefined) => Doctor | undefined {
  const of = doctorsCache.useMany(hospitalIds);
  return (hospitalId, doctorId) => of(hospitalId).find((doctor) => doctor.id === doctorId);
}

/** Already-loaded doctors of a hospital (booking validation). */
export function loadedDoctors(hospitalId: string | null): readonly Doctor[] {
  return doctorsCache.peek(hospitalId);
}
