import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

/**
 * Device-only (local) notifications: shown or scheduled by this phone, no
 * server involved. The in-app notification center (Firestore) never
 * depends on this module.
 *
 * Capability boundary: `expo-notifications` is loaded lazily and only
 * where it works. On Android Expo Go (SDK 53+) merely evaluating the
 * package throws (its push-token auto-registration runs at import time),
 * so there it is never loaded and every call here is a no-op that reports
 * "not scheduled". Development and production builds, and iOS Expo Go,
 * get real local notifications. Remote push needs a development build;
 * see docs/firebase-data-model.md → Notifications.
 */
export const nativeNotificationsAvailable = !(isRunningInExpoGo() && Platform.OS === "android");

type NotificationsModule = typeof import("expo-notifications");

const CHANNEL = "default";
let loading: Promise<NotificationsModule | null> | null = null;
let warned = false;

/** Explains once (development only) why phone alerts are off. */
function warnUnavailable(): void {
  if (!__DEV__ || warned) return;
  warned = true;
  console.warn(
    "[AfyaQueue] Phone alerts and reminders are off in Expo Go on Android. In-app notifications still work; use a development build for device notifications."
  );
}

/** The module, configured once; null where unsupported or if loading fails. */
function load(): Promise<NotificationsModule | null> {
  if (!nativeNotificationsAvailable) {
    warnUnavailable();
    return Promise.resolve(null);
  }
  loading ??= import("expo-notifications").then(
    (Notifications) => {
      // Show alerts while the app is open too (the in-app center lists them as well).
      Notifications.setNotificationHandler({
        handleNotification: () =>
          Promise.resolve({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
      });
      return Notifications;
    },
    () => null
  );
  return loading;
}

/**
 * Asks once (the OS remembers the answer). Returns whether alerts may be
 * shown; false where device notifications aren't supported. Never throws:
 * a phone that refuses still has the in-app center.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Appointments and queue",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export type LocalAlert = { title: string; body: string; data?: Record<string, string> };

/** Shows an alert now. Returns whether it was handed to the OS. */
export async function presentNow(alert: LocalAlert): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: alert.title, body: alert.body, data: alert.data ?? {} },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
    return true;
  } catch {
    // The in-app center still has it.
    return false;
  }
}

/**
 * Schedules an alert at a time, under an identifier we can cancel later.
 * Returns false (nothing scheduled) where unsupported or on failure.
 */
export async function scheduleAt(
  identifier: string,
  date: Date,
  alert: LocalAlert
): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: alert.title, body: alert.body, data: alert.data ?? {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === "android" ? { channelId: CHANNEL } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Identifiers of alerts this app has scheduled and not yet shown. */
export async function scheduledIds(): Promise<string[]> {
  const Notifications = await load();
  if (!Notifications) return [];
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).map(
      (request) => request.identifier
    );
  } catch {
    return [];
  }
}

export async function cancelScheduled(identifier: string): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Already shown or gone.
  }
}

/** Taps on an alert (app opened from it, or tapped while open). No-op where unsupported. */
export function onAlertTapped(handler: (data: Record<string, unknown>) => void): () => void {
  let stopped = false;
  let remove: (() => void) | null = null;
  void load().then((Notifications) => {
    if (!Notifications || stopped) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      handler(response.notification.request.content.data ?? {})
    );
    remove = () => subscription.remove();
  });
  return () => {
    stopped = true;
    remove?.();
  };
}
