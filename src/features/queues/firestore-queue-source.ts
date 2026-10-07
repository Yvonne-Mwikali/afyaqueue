import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  type DocumentData,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import { canCheckIn } from "@/features/appointments/appointment";
import { parseAppointmentDocument } from "@/features/appointments/firestore-appointment-repository";
import { AppError } from "@/lib/app-error";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type { QueueEntry, QueueEntryStatus } from "./queue-entry";
import type { QueueSource } from "./queue-source";

const STATUSES: readonly QueueEntryStatus[] = [
  "waiting",
  "next",
  "called",
  "in-service",
  "on-hold",
  "delayed",
  "held",
  "completed",
  "no-show",
];

/** Fallback minutes per patient when a queue has no estimate. */
const DEFAULT_SERVICE_MINUTES = 10;

type QueueProgress = { nowServing: number; serviceMinutes: number };

/**
 * One queue per service per day (rule 17): "{serviceId}_{YYYY-MM-DD}".
 * Its `lastNumber` counter issues queue numbers; rules only allow +1 per
 * check-in, together with that check-in's entry.
 */
export function queueIdFor(serviceId: string, date: string): string {
  return `${serviceId}_${date}`;
}

function toEntry(id: string, data: DocumentData, progress?: QueueProgress): QueueEntry | null {
  const { appointmentId, queueId, queueNumber, status, scheduledPriority, hospitalId } = data;
  if (
    typeof hospitalId !== "string" ||
    typeof appointmentId !== "string" ||
    typeof queueId !== "string" ||
    typeof queueNumber !== "number" ||
    !STATUSES.includes(status)
  ) {
    return null;
  }
  const nowServing = progress?.nowServing ?? 0;
  // Approximate until staff ordering exists: numbers still to be served before yours.
  const peopleAhead = Math.max(0, queueNumber - nowServing - 1);
  return {
    id,
    hospitalId,
    appointmentId,
    queueKey: queueId,
    queueNumber,
    status,
    nowServing,
    scheduledPriority: scheduledPriority === true,
    peopleAhead,
    estimatedWaitMinutes: peopleAhead * (progress?.serviceMinutes ?? DEFAULT_SERVICE_MINUTES),
    ...(typeof data.callCount === "number" ? { callCount: data.callCount } : {}),
    ...(data.lastCalledAt instanceof Timestamp ? { lastCalledAt: data.lastCalledAt.toDate() } : {}),
  };
}

export const firestoreQueueSource: QueueSource = {
  watchForPatient: (patientId, onChange, onError) => {
    const db = firestore();
    let entryDocs: { id: string; data: DocumentData }[] = [];
    const progress = new Map<string, QueueProgress>();
    const queueListeners = new Map<string, () => void>();

    const emit = (): void =>
      onChange(
        entryDocs.flatMap(({ id, data }) => {
          const entry = toEntry(id, data, progress.get(String(data.queueId)));
          return entry ? [entry] : [];
        })
      );

    // Follow each queue the patient is in, for "now serving".
    const followQueues = (): void => {
      const wanted = new Set(entryDocs.map(({ data }) => String(data.queueId)));
      for (const [queueId, stop] of queueListeners) {
        if (!wanted.has(queueId)) {
          stop();
          queueListeners.delete(queueId);
          progress.delete(queueId);
        }
      }
      for (const queueId of wanted) {
        if (queueListeners.has(queueId)) continue;
        queueListeners.set(
          queueId,
          onSnapshot(
            doc(db, COLLECTIONS.queues, queueId),
            (snapshot) => {
              const nowServing = snapshot.get("nowServing");
              const minutes = snapshot.get("estimatedServiceMinutes");
              progress.set(queueId, {
                nowServing: typeof nowServing === "number" ? nowServing : 0,
                serviceMinutes: typeof minutes === "number" ? minutes : DEFAULT_SERVICE_MINUTES,
              });
              emit();
            },
            onError
          )
        );
      }
    };

    const stopEntries = onSnapshot(
      query(collection(db, COLLECTIONS.queueEntries), where("patientId", "==", patientId)),
      (snapshot) => {
        entryDocs = snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
        followQueues();
        emit();
      },
      onError
    );

    return () => {
      stopEntries();
      queueListeners.forEach((stop) => stop());
      queueListeners.clear();
    };
  },

  checkIn: async (appointmentId, patientId) => {
    const db = firestore();
    const appointmentRef = doc(db, COLLECTIONS.appointments, appointmentId);
    try {
      return await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(appointmentRef);
        const data = snapshot.exists() ? snapshot.data() : null;
        const appointment = data ? parseAppointmentDocument(snapshot.id, data) : null;
        if (!data || !appointment || data.patientId !== patientId) {
          throw new AppError("This appointment could not be found.");
        }
        if (!canCheckIn(appointment)) {
          throw new AppError("This appointment can't be checked in right now.");
        }
        const date = String(data.date);
        const queueId = queueIdFor(appointment.serviceId, date);
        const queueRef = doc(db, COLLECTIONS.queues, queueId);
        const queue = await transaction.get(queueRef);
        const lastNumber = queue.exists() ? Number(queue.get("lastNumber") ?? 0) : 0;
        const queueNumber = lastNumber + 1;
        // Rules re-derive this from server time (rules 10–11).
        const scheduledPriority = Date.now() <= appointment.scheduledAt.getTime();

        transaction.update(appointmentRef, {
          status: "checked-in",
          checkedInAt: serverTimestamp(),
          scheduledPriority,
          updatedAt: serverTimestamp(),
        });
        if (queue.exists()) {
          transaction.update(queueRef, {
            lastNumber: queueNumber,
            lastEntryId: appointmentId,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(queueRef, {
            hospitalId: appointment.hospitalId,
            serviceId: appointment.serviceId,
            date,
            lastNumber: queueNumber,
            lastEntryId: appointmentId,
            nowServing: 0,
            status: "open",
            estimatedServiceMinutes: appointment.durationMinutes ?? DEFAULT_SERVICE_MINUTES,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        // Entry id = appointment id: one entry per appointment, ever.
        const entry = {
          hospitalId: appointment.hospitalId,
          // The appointment's doctor (null = any), so doctors see their own queue.
          doctorId: appointment.doctorId ?? null,
          queueId,
          appointmentId,
          visitId: appointment.visitId,
          patientId,
          // Staff display name, carried over from the appointment (rules check).
          patientName: typeof data.patientName === "string" ? data.patientName : "",
          queueNumber,
          status: "waiting",
          scheduledPriority,
          checkedInAt: serverTimestamp(),
        };
        transaction.set(doc(db, COLLECTIONS.queueEntries, appointmentId), entry);
        const nowServing = queue.exists() ? Number(queue.get("nowServing") ?? 0) : 0;
        const minutes = queue.exists()
          ? Number(queue.get("estimatedServiceMinutes") ?? DEFAULT_SERVICE_MINUTES)
          : (appointment.durationMinutes ?? DEFAULT_SERVICE_MINUTES);
        const created = toEntry(appointmentId, entry, { nowServing, serviceMinutes: minutes });
        if (!created) throw new AppError("Something went wrong. Please try again.");
        return created;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const code = error instanceof FirebaseError ? error.code : "";
      if (code === "unavailable") {
        throw new AppError("No connection. Check your internet and try again.");
      }
      if (code === "permission-denied") {
        throw new AppError("This appointment can't be checked in right now.");
      }
      throw new AppError("Something went wrong. Please try again.");
    }
  },
};
