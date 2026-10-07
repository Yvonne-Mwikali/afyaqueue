import { FirebaseError } from "firebase/app";
import {
  type DocumentSnapshot,
  type Transaction,
  collection,
  doc,
  type DocumentData,
  type Query,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import type { MemberRole } from "@/features/hospitals/hospital";
import {
  type HoldReason,
  type QueueAction,
  TRANSITIONS,
  UNDO_START_WINDOW_MS,
} from "@/features/queues/queue-actions";
import type { QueueEntryStatus } from "@/features/queues/queue-entry";
import { AppError } from "@/lib/app-error";
import { firebaseAuth } from "@/lib/firebase/auth";
import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import type { StaffQueue, StaffQueueEntry, StaffQueueRepository, StaffVisit } from "./staff-queue";

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

const dateOf = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

function parseQueue(id: string, data: DocumentData): StaffQueue | null {
  const { serviceId, date, nowServing, lastNumber, status } = data;
  if (typeof serviceId !== "string" || typeof date !== "string") return null;
  return {
    id,
    serviceId,
    date,
    nowServing: typeof nowServing === "number" ? nowServing : 0,
    lastNumber: typeof lastNumber === "number" ? lastNumber : 0,
    status: status === "paused" || status === "closed" ? status : "open",
  };
}

/** Appointment time and doctor, fetched once per entry. */
type EntryContext = {
  serviceId: string;
  scheduledAt: Date | null;
  doctorId: string | null;
  /** Fallback for entries created before patientName was copied onto them. */
  appointmentPatientName: string;
};

function staffUid(): string {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid) throw new AppError("Please sign in again.");
  return uid;
}

function rethrow(error: unknown): never {
  if (error instanceof AppError) throw error;
  const code = error instanceof FirebaseError ? error.code : "";
  if (code === "unavailable")
    throw new AppError("No connection. Check your internet and try again.");
  if (code === "permission-denied") {
    throw new AppError("This change isn't allowed. The queue may have changed; it will refresh.");
  }
  throw new AppError("Something went wrong. Please try again.");
}

/** Action-specific fields written with each transition (rules check them). */
function actionFields(
  action: QueueAction,
  uid: string,
  data: DocumentData,
  holdReason?: HoldReason
): Record<string, unknown> {
  const now = serverTimestamp();
  switch (action) {
    case "call":
    case "call-again":
      return {
        callCount: Number(data.callCount ?? 0) + 1,
        lastCalledAt: now,
        lastCalledBy: uid,
      };
    case "hold":
      return { heldAt: now, heldBy: uid, ...(holdReason ? { holdReason } : {}) };
    case "resume":
      return { resumedAt: now, resumedBy: uid };
    case "start":
      return { serviceStartedAt: now, serviceStartedBy: uid };
    case "undo-start":
      return { startUndoneAt: now, startUndoneBy: uid };
    case "complete":
      return { completedAt: now, completedBy: uid };
    case "no-show":
      return { noShowAt: now, noShowBy: uid };
  }
}

/**
 * Writes one transition inside a transaction: the entry's new status and
 * metadata, its next audit event (queueEntries/{id}/events/{n}), and, for
 * Complete / No Show, the appointment. Throws AppError when the entry has
 * already changed (another staff member or doctor got there first).
 */
function writeTransition(
  transaction: Transaction,
  entry: DocumentSnapshot,
  action: QueueAction,
  actor: Actor,
  holdReason?: HoldReason
): void {
  const db = firestore();
  const data = entry.data() ?? {};
  const { from, to } = TRANSITIONS[action];
  const eventCount = Number(data.eventCount ?? 0) + 1;
  transaction.update(entry.ref, {
    status: to,
    ...actionFields(action, actor.uid, data, holdReason),
    eventCount,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });
  // Context copied from the entry (rules check it) so admins can query a
  // hospital's history without reading entries or patient profiles.
  transaction.set(doc(entry.ref, "events", String(eventCount)), {
    action,
    from,
    to,
    at: serverTimestamp(),
    by: actor.uid,
    byRole: actor.role,
    hospitalId: data.hospitalId,
    queueId: data.queueId,
    queueNumber: data.queueNumber,
    patientName: data.patientName ?? "",
  });
  if (action === "complete" || action === "no-show") {
    transaction.update(doc(db, COLLECTIONS.appointments, String(data.appointmentId)), {
      status: action === "complete" ? "completed" : "no-show",
      ...(action === "complete"
        ? { completedAt: serverTimestamp() }
        : { noShowAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    });
  }
}

type Actor = { uid: string; role: MemberRole };

function actor(role: MemberRole): Actor {
  return { uid: staffUid(), role };
}

function parseVisit(id: string, data: DocumentData): StaffVisit | null {
  if (typeof data.serviceId !== "string" || typeof data.status !== "string") return null;
  return {
    appointmentId: id,
    patientName: typeof data.patientName === "string" ? data.patientName : "",
    serviceId: data.serviceId,
    doctorId: typeof data.doctorId === "string" ? data.doctorId : null,
    scheduledAt: dateOf(data.scheduledAt),
    status: data.status,
  };
}

/**
 * Live queue entries for a query, each with its appointment's time and
 * doctor (fetched once). Staff never read patient profiles: the display
 * name is on the entry.
 */
function subscribeEntries(
  entriesQuery: Query,
  onChange: (entries: StaffQueueEntry[]) => void,
  onError: (error: unknown) => void
): () => void {
  const db = firestore();
  const context = new Map<string, Promise<EntryContext>>();
  let latest = 0;

  const contextFor = (appointmentId: string): Promise<EntryContext> => {
    const cached = context.get(appointmentId);
    if (cached) return cached;
    const loaded = getDoc(doc(db, COLLECTIONS.appointments, appointmentId)).then((appointment) => ({
      serviceId: String(appointment.get("serviceId") ?? ""),
      scheduledAt: dateOf(appointment.get("scheduledAt")),
      doctorId:
        typeof appointment.get("doctorId") === "string" ? appointment.get("doctorId") : null,
      appointmentPatientName: String(appointment.get("patientName") ?? ""),
    }));
    context.set(appointmentId, loaded);
    return loaded;
  };

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      const run = ++latest;
      void Promise.all(
        snapshot.docs.map(async (entry): Promise<StaffQueueEntry | null> => {
          const data = entry.data();
          if (!STATUSES.includes(data.status) || typeof data.queueNumber !== "number") return null;
          const { appointmentPatientName, ...extra } = await contextFor(String(data.appointmentId));
          return {
            id: entry.id,
            appointmentId: String(data.appointmentId),
            queueId: String(data.queueId),
            queueNumber: data.queueNumber,
            status: data.status,
            scheduledPriority: data.scheduledPriority === true,
            checkedInAt: dateOf(data.checkedInAt),
            callCount: typeof data.callCount === "number" ? data.callCount : 0,
            lastCalledAt: dateOf(data.lastCalledAt),
            serviceStartedAt: dateOf(data.serviceStartedAt),
            patientName:
              typeof data.patientName === "string" && data.patientName
                ? data.patientName
                : appointmentPatientName,
            ...extra,
          };
        })
      ).then((entries) => {
        if (run === latest) onChange(entries.flatMap((entry) => entry ?? []));
      }, onError);
    },
    onError
  );
}

export const firestoreStaffQueueRepository: StaffQueueRepository = {
  watchVisits: (hospitalId, date, onChange, onError, doctorId) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.appointments),
        where("hospitalId", "==", hospitalId),
        where("date", "==", date),
        // Doctors may only read appointments assigned to them.
        ...(doctorId ? [where("doctorId", "==", doctorId)] : [])
      ),
      (snapshot) =>
        onChange(
          snapshot.docs
            .flatMap((appointment) => parseVisit(appointment.id, appointment.data()) ?? [])
            .filter((visit) => visit.status !== "cancelled")
        ),
      onError
    ),

  watchQueues: (hospitalId, date, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.queues),
        where("hospitalId", "==", hospitalId),
        where("date", "==", date)
      ),
      (snapshot) =>
        onChange(snapshot.docs.flatMap((queue) => parseQueue(queue.id, queue.data()) ?? [])),
      onError
    ),

  watchEntries: (hospitalId, queueIds, onChange, onError) => {
    if (queueIds.length === 0) {
      onChange([]);
      return () => undefined;
    }
    // `in` queries take up to 30 values: one per service queue today.
    return subscribeEntries(
      query(
        collection(firestore(), COLLECTIONS.queueEntries),
        // Rules only let staff read their own hospital's entries.
        where("hospitalId", "==", hospitalId),
        where("queueId", "in", queueIds.slice(0, 30))
      ),
      onChange,
      onError
    );
  },

  watchDoctorEntries: (hospitalId, doctorId, since, onChange, onError) =>
    subscribeEntries(
      query(
        collection(firestore(), COLLECTIONS.queueEntries),
        // Rules only let a doctor read entries assigned to them.
        where("hospitalId", "==", hospitalId),
        where("doctorId", "==", doctorId),
        where("checkedInAt", ">=", Timestamp.fromDate(since))
      ),
      onChange,
      onError
    ),

  callNext: async (queueId, candidates, role) => {
    const db = firestore();
    const who = actor(role);
    const queueRef = doc(db, COLLECTIONS.queues, queueId);
    try {
      for (const entryId of candidates) {
        const entryRef = doc(db, COLLECTIONS.queueEntries, entryId);
        // If someone else called this entry a moment earlier, our write is
        // checked against the new state and refused (rules) or retried
        // (contention). Either way, re-read once: it now shows "called",
        // so we move on to the next candidate.
        const attempt = (): Promise<boolean> =>
          runTransaction(db, async (transaction) => {
            const queue = await transaction.get(queueRef);
            const entry = await transaction.get(entryRef);
            if (!queue.exists() || !entry.exists()) return false;
            if (entry.get("status") !== "waiting" || entry.get("queueId") !== queueId) return false;
            writeTransition(transaction, entry, "call", who);
            transaction.update(queueRef, {
              nowServing: entry.get("queueNumber"),
              currentEntryId: entryId,
              callVersion: Number(queue.get("callVersion") ?? 0) + 1,
              updatedAt: serverTimestamp(),
              updatedBy: who.uid,
            });
            return true;
          });
        let called: boolean;
        try {
          called = await attempt();
        } catch (error) {
          if (!(error instanceof FirebaseError && error.code === "permission-denied")) throw error;
          called = await attempt();
        }
        if (called) return entryId;
      }
      return null;
    } catch (error) {
      rethrow(error);
    }
  },

  perform: async (entryId, action, role, holdReason) => {
    const db = firestore();
    const who = actor(role);
    const entryRef = doc(db, COLLECTIONS.queueEntries, entryId);
    const attempt = (): Promise<void> =>
      runTransaction(db, async (transaction) => {
        const entry = await transaction.get(entryRef);
        if (!entry.exists() || entry.get("status") !== TRANSITIONS[action].from) {
          throw new AppError("This patient's status has already changed.");
        }
        if (action === "undo-start") {
          const startedAt = dateOf(entry.get("serviceStartedAt"));
          if (!startedAt || Date.now() - startedAt.getTime() >= UNDO_START_WINDOW_MS) {
            throw new AppError("Undo Start is only possible for 2 minutes after starting.");
          }
        }
        writeTransition(transaction, entry, action, who, holdReason);
      });
    try {
      try {
        await attempt();
      } catch (error) {
        // Someone acted on this entry a moment earlier: rules refuse our
        // stale write. Re-read once; the status check above decides again.
        if (!(error instanceof FirebaseError && error.code === "permission-denied")) throw error;
        await attempt();
      }
    } catch (error) {
      rethrow(error);
    }
  },
};
