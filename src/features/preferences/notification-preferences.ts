import { useSyncExternalStore } from "react";

import { readPreference, writePreference } from "@/lib/storage";

/** Profile → Preferences: which phone alerts this device shows. */
export type NotificationPreferences = {
  /** Local reminders 24 hours and 1 hour before a booked appointment. */
  appointmentReminders: boolean;
  /** A phone alert when staff call, call again, hold or resume your queue place. */
  queueAlerts: boolean;
};

const STORAGE_KEY = "notification-preferences";
const DEFAULTS: NotificationPreferences = { appointmentReminders: true, queueAlerts: true };

let current: NotificationPreferences = DEFAULTS;
const listeners = new Set<() => void>();

function emit(next: NotificationPreferences): void {
  current = next;
  listeners.forEach((listener) => listener());
}

/** Loads saved choices. Call once at startup; defaults apply until then. */
export async function restoreNotificationPreferences(): Promise<void> {
  const saved = await readPreference(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null) return;
    const value = parsed as Record<string, unknown>;
    emit({
      appointmentReminders: value.appointmentReminders !== false,
      queueAlerts: value.queueAlerts !== false,
    });
  } catch {
    // Corrupt value: keep the defaults.
  }
}

/** The device's notification choices and a setter that saves them. */
export function useNotificationPreferences(): [
  NotificationPreferences,
  (change: Partial<NotificationPreferences>) => void,
] {
  const preferences = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current
  );
  return [
    preferences,
    (change) => {
      const next = { ...current, ...change };
      emit(next);
      void writePreference(STORAGE_KEY, JSON.stringify(next));
    },
  ];
}
