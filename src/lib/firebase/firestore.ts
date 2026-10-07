import { type Firestore, getFirestore } from "firebase/firestore";

import { firebaseApp } from "./config";

/** Cloud Firestore for the AfyaQueue project (schema: docs/firebase-data-model.md). */
export function firestore(): Firestore {
  return getFirestore(firebaseApp());
}

/** Collection names, in one place so rules, docs and code stay aligned. */
export const COLLECTIONS = {
  hospitals: "hospitals",
  hospitalMembers: "hospitalMembers",
  hospitalInvites: "hospitalInvites",
  hospitalPatients: "hospitalPatients",
  doctorSchedules: "doctorSchedules",
  doctorAbsences: "doctorAbsences",
  users: "users",
  services: "services",
  doctors: "doctors",
  doctorServices: "doctorServices",
  visits: "visits",
  appointments: "appointments",
  queues: "queues",
  queueEntries: "queueEntries",
  /** Slot locks (src/features/appointments/slot-locks.ts). */
  doctorSlots: "doctorSlots",
  patientSlots: "patientSlots",
} as const;
