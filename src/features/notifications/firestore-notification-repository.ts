import {
  collection,
  doc,
  type DocumentData,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { COLLECTIONS, firestore } from "@/lib/firebase/firestore";

import {
  type AppNotification,
  NOTIFICATION_TYPES,
  type NotificationRepository,
  type NotificationType,
} from "./notification";

const RECENT = 50;

function parseNotification(id: string, data: DocumentData): AppNotification | null {
  const { userId, hospitalId, type, title, body } = data;
  if (
    typeof userId !== "string" ||
    typeof hospitalId !== "string" ||
    !NOTIFICATION_TYPES.includes(type as NotificationType) ||
    typeof title !== "string" ||
    typeof body !== "string"
  ) {
    return null;
  }
  const optional = (key: string): string | undefined =>
    typeof data[key] === "string" ? (data[key] as string) : undefined;
  const relatedAppointmentId = optional("relatedAppointmentId");
  const relatedQueueEntryId = optional("relatedQueueEntryId");
  const relatedHospitalId = optional("relatedHospitalId");
  return {
    id,
    userId,
    hospitalId,
    type: type as NotificationType,
    title,
    body,
    read: data.read === true,
    // Pending server timestamps read as null locally: treat as "now".
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    ...(relatedAppointmentId ? { relatedAppointmentId } : {}),
    ...(relatedQueueEntryId ? { relatedQueueEntryId } : {}),
    ...(relatedHospitalId ? { relatedHospitalId } : {}),
  };
}

export const firestoreNotificationRepository: NotificationRepository = {
  watchMine: (userId, onChange, onError) =>
    onSnapshot(
      query(
        collection(firestore(), COLLECTIONS.notifications),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(RECENT)
      ),
      (snapshot) =>
        onChange(snapshot.docs.flatMap((item) => parseNotification(item.id, item.data()) ?? [])),
      onError
    ),

  markRead: async (id) => {
    await updateDoc(doc(firestore(), COLLECTIONS.notifications, id), { read: true });
  },

  markAllRead: async (ids) => {
    const db = firestore();
    // Batches take up to 500 writes; the center shows at most 50.
    const batch = writeBatch(db);
    ids.forEach((id) => batch.update(doc(db, COLLECTIONS.notifications, id), { read: true }));
    await batch.commit();
  },
};
