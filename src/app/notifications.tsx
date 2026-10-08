import { useRouter } from "expo-router";
import { type JSX, useState } from "react";
import { Alert } from "react-native";

import { NotificationList } from "@/components/shared/notification-list";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useHospitalContext } from "@/features/hospitals/hospital-context";
import { notificationTarget } from "@/features/notifications/notification-target";
import { useNotifications } from "@/features/notifications/notifications-context";
import { errorMessage } from "@/lib/app-error";

/** Notification center, reachable from the bell in every area. */
export default function NotificationsRoute(): JSX.Element {
  const router = useRouter();
  const { mode, workspace } = useHospitalContext();
  const inbox = useNotifications();
  // Relative times are computed against when the screen opened.
  const [now] = useState(() => new Date());
  const area = mode === "patient" ? "patient" : workspace?.role === "doctor" ? "doctor" : "staff";

  const fail = (error: unknown): void =>
    Alert.alert("Couldn't update notifications", errorMessage(error));

  return (
    <Screen header={<ScreenHeader title="Notifications" onBack={() => router.back()} />}>
      <NotificationList
        status={inbox.status}
        notifications={inbox.notifications}
        unreadCount={inbox.unreadCount}
        now={now}
        onRetry={inbox.retry}
        onMarkAllRead={() => void inbox.markAllRead().catch(fail)}
        onOpen={(item) => {
          if (!item.read) void inbox.markRead(item.id).catch(() => undefined);
          const target = notificationTarget(item, area);
          if (target) router.navigate(target);
        }}
      />
    </Screen>
  );
}
