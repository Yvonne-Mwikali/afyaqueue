import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  type DocumentData,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import type { ServiceMode } from "@/features/services/service-catalog";
import { AppError } from "@/lib/app-error";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import { type Appointment, type AppointmentStatus, localDateKey, visitIdFor } from "./appointment";
import type { AppointmentRepository } from "./appointment-repository";
import { blockStarts, doctorLockId, isOnSlotGrid, patientLockId } from "./slot-locks";

const STATUSES: readonly AppointmentStatus[] = [
  "booked",
  "checked-in",
  "waiting",
  "delayed",
  "completed",
  "cancelled",
];
const VISIT_TYPES: readonly ServiceMode[] = ["in-clinic", "online"];

/** Writes wait for the server; offline they would otherwise hang. */
const WRITE_TIMEOUT_MS = 15_000;

/**
 * Maps an appointments/{id} document (docs/firebase-data-model.md) to the
 * domain type, or null when required fields are missing or malformed.
 */
export function parseAppointmentDocument(id: string, data: DocumentData): Appointment | null {
  const { visitId, serviceId, doctorId, scheduledAt, durationMinutes, visitType, status } = data;
  const { hospitalId } = data;
  if (
    typeof hospitalId !== "string" ||
    typeof visitId !== "string" ||
    typeof serviceId !== "string" ||
    !(scheduledAt instanceof Timestamp) ||
    !STATUSES.includes(status)
  ) {
    return null;
  }
  return {
    id,
    hospitalId,
    visitId,
    serviceId,
    ...(typeof doctorId === "string" ? { doctorId } : {}),
    scheduledAt: scheduledAt.toDate(),
    ...(typeof durationMinutes === "number" ? { durationMinutes } : {}),
    ...(VISIT_TYPES.includes(visitType) ? { visitType } : {}),
    status,
  };
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AppError(message)), WRITE_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function rethrow(error: unknown, denied: string): never {
  if (error instanceof AppError) throw error;
  const code = error instanceof FirebaseError ? error.code : "";
  if (code === "permission-denied") throw new AppError(denied);
  if (code === "unavailable")
    throw new AppError("No connection. Check your internet and try again.");
  throw new AppError("Something went wrong. Please try again.");
}

export const firestoreAppointmentRepository: AppointmentRepository = {
  watchForPatient: (patientId, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.appointments),
        where("patientId", "==", patientId),
        orderBy("scheduledAt")
      ),
      (snapshot) =>
        onChange(
          snapshot.docs.flatMap(
            (document) => parseAppointmentDocument(document.id, document.data()) ?? []
          )
        ),
      onError
    ),

  book: async (appointment) => {
    const { patientId, doctorId, scheduledAt, durationMinutes } = appointment;
    if (!isOnSlotGrid(scheduledAt)) throw new AppError("Please choose one of the listed times.");
    const db = firestore();
    const ref = doc(collection(db, COLLECTIONS.appointments));
    const startAt = Timestamp.fromDate(scheduledAt);
    // Display name for staff screens, copied from the patient's own profile
    // (rules check it matches), so staff never need to read profiles.
    let patientName = "";
    let patientPhone = "";
    try {
      const profile = await getDoc(doc(db, COLLECTIONS.users, patientId));
      patientName = String(profile.get("fullName") ?? "");
      // Callback number for this visit (rules check it's the profile phone).
      patientPhone = String(profile.get("phone") ?? "");
    } catch (error) {
      rethrow(error, "We couldn't book this time. Please try again.");
    }
    const batch = writeBatch(db);
    const { hospitalId } = appointment;
    batch.set(ref, {
      hospitalId,
      patientId,
      patientName,
      patientPhone,
      visitId: visitIdFor(patientId, scheduledAt),
      serviceId: appointment.serviceId,
      doctorId,
      scheduledAt: startAt,
      date: localDateKey(scheduledAt),
      durationMinutes,
      visitType: appointment.visitType,
      status: "booked",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Locks fail the whole batch if the time is already taken (see slot-locks.ts).
    batch.set(doc(db, COLLECTIONS.patientSlots, patientLockId(patientId, scheduledAt.getTime())), {
      hospitalId,
      patientId,
      startAt,
      appointmentId: ref.id,
    });
    if (doctorId) {
      for (const block of blockStarts(scheduledAt, durationMinutes)) {
        batch.set(doc(db, COLLECTIONS.doctorSlots, doctorLockId(doctorId, block)), {
          hospitalId,
          doctorId,
          startAt: Timestamp.fromMillis(block),
          appointmentId: ref.id,
        });
      }
    }
    // The patient's own confirmation in their inbox (rules tie it to this booking).
    batch.set(doc(db, COLLECTIONS.notifications, `${ref.id}_booked`), {
      userId: patientId,
      hospitalId,
      type: "appointment-booked",
      title: appointment.notice.title,
      body: appointment.notice.body,
      read: false,
      createdAt: serverTimestamp(),
      relatedAppointmentId: ref.id,
      relatedHospitalId: hospitalId,
    });
    try {
      await withTimeout(
        batch.commit(),
        // The write may still reach the server later, so don't invite a duplicate.
        "We couldn't confirm your booking. Check My Appointments before trying again."
      );
      return ref.id;
    } catch (error) {
      // Denied almost always means the slot was taken a moment ago.
      rethrow(error, "That time was just booked. Please choose another time.");
    }
  },

  cancel: async (appointmentId) => {
    const db = firestore();
    const ref = doc(db, COLLECTIONS.appointments, appointmentId);
    try {
      const snapshot = await getDoc(ref);
      const appointment = snapshot.exists()
        ? parseAppointmentDocument(snapshot.id, snapshot.data())
        : null;
      if (!appointment) throw new AppError("This appointment could not be found.");
      const patientId = snapshot.get("patientId") as string;
      const batch = writeBatch(db);
      batch.update(ref, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Release the time so others can book it (rules require this).
      const start = appointment.scheduledAt;
      batch.delete(doc(db, COLLECTIONS.patientSlots, patientLockId(patientId, start.getTime())));
      if (appointment.doctorId && appointment.durationMinutes !== undefined) {
        for (const block of blockStarts(start, appointment.durationMinutes)) {
          batch.delete(doc(db, COLLECTIONS.doctorSlots, doctorLockId(appointment.doctorId, block)));
        }
      }
      await withTimeout(
        batch.commit(),
        "We couldn't confirm the cancellation. Check My Appointments before trying again."
      );
    } catch (error) {
      rethrow(error, "This appointment can no longer be cancelled in the app.");
    }
  },
};
