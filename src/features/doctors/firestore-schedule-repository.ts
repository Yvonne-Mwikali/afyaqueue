import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import { AppError } from "@/lib/app-error";
import { firebaseAuth } from "@/lib/firebase/auth";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import { type AbsenceKind, type DoctorAbsence, parseTime, type ScheduleWindow } from "./schedule";
import type { DoctorAvailability, ScheduleRepository } from "./schedule-repository";

const KINDS: readonly AbsenceKind[] = ["leave", "unavailable", "temporary"];

function parseWindow(id: string, data: DocumentData): ScheduleWindow | null {
  const startMinutes = parseTime(data.startTime);
  const endMinutes = parseTime(data.endTime);
  const { hospitalId, doctorId, dayOfWeek } = data;
  if (
    typeof hospitalId !== "string" ||
    typeof doctorId !== "string" ||
    typeof dayOfWeek !== "number" ||
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }
  return { id, hospitalId, doctorId, dayOfWeek, startMinutes, endMinutes };
}

function parseAbsence(id: string, data: DocumentData): DoctorAbsence | null {
  const { hospitalId, doctorId, startAt, endAt, kind } = data;
  if (
    typeof hospitalId !== "string" ||
    typeof doctorId !== "string" ||
    !(startAt instanceof Timestamp) ||
    !(endAt instanceof Timestamp)
  ) {
    return null;
  }
  return {
    id,
    hospitalId,
    doctorId,
    startAt: startAt.toDate(),
    endAt: endAt.toDate(),
    kind: KINDS.includes(kind) ? kind : "unavailable",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
  };
}

function rethrow(error: unknown, denied: string): never {
  const code = error instanceof FirebaseError ? error.code : "";
  if (code === "permission-denied") throw new AppError(denied);
  if (code === "unavailable")
    throw new AppError("No connection. Check your internet and try again.");
  throw new AppError("Something went wrong. Please try again.");
}

const schedulesQuery = (hospitalId: string, doctorId?: string) =>
  query(
    collection(firestore(), COLLECTIONS.doctorSchedules),
    where("hospitalId", "==", hospitalId),
    where("active", "==", true),
    ...(doctorId ? [where("doctorId", "==", doctorId)] : [])
  );

// Absences that haven't ended (endAt > now), so past leave isn't loaded.
const absencesQuery = (hospitalId: string, doctorId?: string) =>
  query(
    collection(firestore(), COLLECTIONS.doctorAbsences),
    where("hospitalId", "==", hospitalId),
    ...(doctorId ? [where("doctorId", "==", doctorId)] : []),
    where("endAt", ">", Timestamp.now())
  );

export const firestoreScheduleRepository: ScheduleRepository = {
  loadForHospital: async (hospitalId) => {
    const [schedules, absences] = await Promise.all([
      getDocs(schedulesQuery(hospitalId)),
      getDocs(absencesQuery(hospitalId)),
    ]);
    return {
      schedules: schedules.docs.flatMap((d) => parseWindow(d.id, d.data()) ?? []),
      absences: absences.docs.flatMap((d) => parseAbsence(d.id, d.data()) ?? []),
    };
  },

  watchForDoctor: (hospitalId, doctorId, onChange, onError) => {
    let latest: DoctorAvailability = { schedules: [], absences: [] };
    let ready = { schedules: false, absences: false };
    const emit = (): void => {
      if (ready.schedules && ready.absences) onChange(latest);
    };
    const stopSchedules = onSnapshot(
      schedulesQuery(hospitalId, doctorId),
      (snapshot) => {
        latest = {
          ...latest,
          schedules: snapshot.docs.flatMap((d) => parseWindow(d.id, d.data()) ?? []),
        };
        ready = { ...ready, schedules: true };
        emit();
      },
      onError
    );
    const stopAbsences = onSnapshot(
      absencesQuery(hospitalId, doctorId),
      (snapshot) => {
        latest = {
          ...latest,
          absences: snapshot.docs
            .flatMap((d) => parseAbsence(d.id, d.data()) ?? [])
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
        };
        ready = { ...ready, absences: true };
        emit();
      },
      onError
    );
    return () => {
      stopSchedules();
      stopAbsences();
    };
  },

  addAbsence: async ({ hospitalId, doctorId, startAt, endAt, kind }) => {
    const uid = firebaseAuth().currentUser?.uid;
    if (!uid) throw new AppError("Please sign in again.");
    try {
      await addDoc(collection(firestore(), COLLECTIONS.doctorAbsences), {
        hospitalId,
        doctorId,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        kind,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      rethrow(error, "You can only add future absences for yourself.");
    }
  },

  removeAbsence: async (absenceId) => {
    try {
      await deleteDoc(doc(firestore(), COLLECTIONS.doctorAbsences, absenceId));
    } catch (error) {
      rethrow(error, "Only future absences can be removed.");
    }
  },
};
