import { collection, type DocumentData, getDocs, query, where } from "firebase/firestore";

import { initialsFrom } from "@/features/users/user-profile";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type { Doctor } from "./doctor";
import type { DoctorRepository } from "./doctor-repository";

/**
 * Maps doctors/{id} (docs/firebase-data-model.md) to the domain type, or
 * null when required fields are missing. `serviceIds` comes from links.
 */
export function parseDoctorDocument(
  id: string,
  data: DocumentData,
  serviceIds: string[]
): Doctor | null {
  const { name, specialty, hospital, initials, rating, reviewCount } = data;
  if (typeof name !== "string" || typeof specialty !== "string" || typeof hospital !== "string") {
    return null;
  }
  return {
    id,
    name,
    title: specialty,
    initials:
      typeof initials === "string" && initials
        ? initials
        : initialsFrom(name.replace(/^Dr\.?\s+/, "")),
    rating: typeof rating === "number" ? rating : 0,
    reviewCount: typeof reviewCount === "number" ? reviewCount : 0,
    facility: hospital,
    serviceIds,
  };
}

export const firestoreDoctorRepository: DoctorRepository = {
  listActive: async (hospitalId) => {
    const db = firestore();
    // Rules only allow reading active documents, so both queries filter on it.
    const [doctors, links] = await Promise.all([
      getDocs(
        query(
          collection(db, COLLECTIONS.doctors),
          where("hospitalId", "==", hospitalId),
          where("active", "==", true)
        )
      ),
      getDocs(
        query(
          collection(db, COLLECTIONS.doctorServices),
          where("hospitalId", "==", hospitalId),
          where("active", "==", true)
        )
      ),
    ]);
    const servicesByDoctor = new Map<string, string[]>();
    for (const link of links.docs) {
      const { doctorId, serviceId } = link.data();
      if (typeof doctorId !== "string" || typeof serviceId !== "string") continue;
      servicesByDoctor.set(doctorId, [...(servicesByDoctor.get(doctorId) ?? []), serviceId]);
    }
    return doctors.docs
      .map((document) => ({
        order:
          typeof document.get("sortOrder") === "number" ? (document.get("sortOrder") as number) : 0,
        doctor: parseDoctorDocument(
          document.id,
          document.data(),
          servicesByDoctor.get(document.id) ?? []
        ),
      }))
      .sort((a, b) => a.order - b.order)
      .flatMap(({ doctor }) => doctor ?? []);
  },
};
