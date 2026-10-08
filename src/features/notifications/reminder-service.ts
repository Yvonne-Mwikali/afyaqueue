import {
  cancelScheduled,
  ensureNotificationPermission,
  nativeNotificationsAvailable,
  scheduleAt,
  scheduledIds,
} from "@/lib/local-notifications";

import { type PlannedReminder, reminderChanges } from "./reminders";

/** What a sync actually did on this phone (nothing is assumed scheduled). */
export type ReminderSyncResult =
  | { status: "unsupported" }
  | { status: "no-permission"; cancelled: number }
  | { status: "synced"; scheduled: number; cancelled: number; failed: number };

let running: Promise<ReminderSyncResult> = Promise.resolve({ status: "unsupported" });

/**
 * Makes the phone's scheduled reminders match `wanted`: cancels reminders
 * for cancelled, completed or moved appointments and adds missing ones.
 * Pass [] to clear them all (reminders turned off, signed out). Calls are
 * serialized so two quick syncs can't schedule the same reminder twice.
 * Where device notifications aren't supported (Android Expo Go) nothing
 * is scheduled and the result says so; in-app notifications are unaffected.
 */
export function syncReminders(wanted: readonly PlannedReminder[]): Promise<ReminderSyncResult> {
  running = running.then(async (): Promise<ReminderSyncResult> => {
    if (!nativeNotificationsAvailable) return { status: "unsupported" };
    const { cancel, add } = reminderChanges(await scheduledIds(), wanted);
    await Promise.all(cancel.map(cancelScheduled));
    if (add.length === 0)
      return { status: "synced", scheduled: 0, cancelled: cancel.length, failed: 0 };
    if (!(await ensureNotificationPermission())) {
      return { status: "no-permission", cancelled: cancel.length };
    }
    let scheduled = 0;
    for (const reminder of add) {
      const ok = await scheduleAt(reminder.id, reminder.at, {
        title: reminder.title,
        body: reminder.body,
        data: { appointmentId: reminder.appointmentId },
      });
      if (ok) scheduled++;
    }
    return {
      status: "synced",
      scheduled,
      cancelled: cancel.length,
      failed: add.length - scheduled,
    };
  });
  return running;
}
