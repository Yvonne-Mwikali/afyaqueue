import type { QueueAction } from "@/features/queues/queue-actions";

/** What happened; decides the icon and where a tap goes. */
export type NotificationType =
  | "appointment-booked"
  | "appointment-affected"
  | "queue-called"
  | "queue-called-again"
  | "queue-held"
  | "queue-resumed"
  | "patient-checked-in";

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "appointment-booked",
  "appointment-affected",
  "queue-called",
  "queue-called-again",
  "queue-held",
  "queue-resumed",
  "patient-checked-in",
];

/** One message in a user's in-app notification center. */
export type AppNotification = {
  id: string;
  userId: string;
  hospitalId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  relatedAppointmentId?: string;
  relatedQueueEntryId?: string;
  relatedHospitalId?: string;
};

export type NotificationRepository = {
  /** The signed-in user's notifications, newest first (most recent 50). */
  watchMine(
    userId: string,
    onChange: (notifications: AppNotification[]) => void,
    onError: (error: unknown) => void
  ): () => void;
  markRead(id: string): Promise<void>;
  markAllRead(ids: readonly string[]): Promise<void>;
};

/** Names used in the human wording of queue notifications. */
export type QueueNoticeContext = { serviceName?: string; hospitalName?: string };

export type QueueNotice = { type: NotificationType; title: string; body: string };

/**
 * Patient-facing wording for a queue change made by staff or a doctor, or
 * null for changes the patient isn't told about (Start, Complete, ...).
 */
export function queueNotice(
  action: QueueAction,
  queueNumber: number,
  context: QueueNoticeContext = {}
): QueueNotice | null {
  const service = context.serviceName ?? "your service";
  const hospital = context.hospitalName ?? "The hospital";
  switch (action) {
    case "call":
      return {
        type: "queue-called",
        title: "It's your turn",
        body: `Please head to ${service}. Queue #${queueNumber} is being called.`,
      };
    case "call-again":
      return {
        type: "queue-called-again",
        title: "You're being called again",
        body: `${hospital} has called you again. Please head to ${service} (Queue #${queueNumber}).`,
      };
    case "hold":
      return {
        type: "queue-held",
        title: "Your place is being held",
        body: "Your queue place is being held. Staff will call you again.",
      };
    case "resume":
      return {
        type: "queue-resumed",
        title: "You're back in the queue",
        body: `You're back in the ${service} queue as #${queueNumber}. We'll let you know when it's your turn.`,
      };
    default:
      return null;
  }
}

/** Queue alerts (as opposed to appointment messages): shown as a phone alert too. */
export function isQueueAlert(type: NotificationType): boolean {
  return type.startsWith("queue-");
}

/** "Today" vs "Earlier" grouping for the notification center. */
export function groupByDay(
  notifications: readonly AppNotification[],
  now: Date
): { title: string; items: AppNotification[] }[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = notifications.filter((item) => item.createdAt.getTime() >= startOfToday);
  const earlier = notifications.filter((item) => item.createdAt.getTime() < startOfToday);
  return [
    { title: "Today", items: today },
    { title: "Earlier", items: earlier },
  ].filter((group) => group.items.length > 0);
}
