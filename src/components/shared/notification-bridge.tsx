import { useRouter } from "expo-router";
import { type JSX, useEffect, useEffectEvent, useRef } from "react";

import { useSession } from "@/features/auth/session";

import { usePatientAppointments } from "@/features/appointments/use-patient-appointments";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { isQueueAlert } from "@/features/notifications/notification";
import { useNotifications } from "@/features/notifications/notifications-context";
import { syncReminders } from "@/features/notifications/reminder-service";
import { planReminders } from "@/features/notifications/reminders";
import { useNotificationPreferences } from "@/features/preferences/notification-preferences";
import { useServicesAcross } from "@/features/services/use-service-catalog";
import { ensureNotificationPermission, onAlertTapped, presentNow } from "@/lib/local-notifications";

/**
 * Turns in-app events into phone alerts while the app is running (Expo Go
 * has no remote push): a local alert for each new queue notification, and
 * 24h / 1h reminders for booked appointments. Renders nothing.
 */
export function NotificationBridge(): JSX.Element | null {
  const { status } = useSession();
  useEffect(() => {
    // Signed out: this phone shouldn't remind anyone about that account.
    if (status === "signed-out") void syncReminders([]);
  }, [status]);
  return status === "signed-in" ? <SignedInBridge /> : null;
}

function SignedInBridge(): null {
  const router = useRouter();
  const { notifications, status } = useNotifications();
  const { hospitals, mode } = useHospitalContext();
  const appointments = usePatientAppointments("all");
  const [preferences] = useNotificationPreferences();
  const hospitalIds = [...new Set(appointments.appointments.map((item) => item.hospitalId))];
  const serviceOf = useServicesAcross(hospitalIds);

  // Reminders: re-planned whenever appointments, their names or the choice change.
  const ready = appointments.status === "ready";
  const named = appointments.appointments.map((item) => ({
    item,
    serviceName: serviceOf(item.hospitalId, item.serviceId)?.name,
    hospitalName: hospitals.find((hospital) => hospital.id === item.hospitalId)?.name,
  }));
  const plannedKey = ready
    ? named
        .map(
          ({ item, serviceName, hospitalName }) =>
            `${item.id}|${item.status}|${item.scheduledAt.getTime()}|${serviceName}|${hospitalName}`
        )
        .join(",")
    : null;
  const sync = useEffectEvent(() => {
    const names = new Map(named.map((entry) => [entry.item.id, entry]));
    void syncReminders(
      preferences.appointmentReminders
        ? planReminders(
            appointments.appointments,
            {
              serviceName: (item) => names.get(item.id)?.serviceName,
              hospitalName: (item) => names.get(item.id)?.hospitalName,
            },
            new Date()
          )
        : []
    );
  });
  useEffect(() => {
    // Still loading: leave what's scheduled alone. Turned off: clear.
    if (plannedKey === null && preferences.appointmentReminders) return;
    sync();
  }, [plannedKey, preferences.appointmentReminders]);

  // Ask once (the phone remembers) so the first queue call can alert.
  const askOnce = useEffectEvent(() => {
    if (preferences.queueAlerts || preferences.appointmentReminders) {
      void ensureNotificationPermission();
    }
  });
  useEffect(() => {
    if (mode === "patient") askOnce();
  }, [mode]);

  // Queue alerts: only notifications that arrive while the app runs, once each.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (status !== "ready") return;
    if (seen.current === null) {
      // First load: everything already in the inbox is old news.
      seen.current = new Set(notifications.map((item) => item.id));
      return;
    }
    for (const item of notifications) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      const alertable = isQueueAlert(item.type) || item.type === "patient-checked-in";
      if (!item.read && alertable && preferences.queueAlerts) {
        void presentNow({ title: item.title, body: item.body, data: { notificationId: item.id } });
      }
    }
  }, [notifications, status, preferences.queueAlerts]);

  // Tapping a phone alert opens the notification center.
  useEffect(() => onAlertTapped(() => router.navigate("/notifications")), [router]);

  return null;
}
