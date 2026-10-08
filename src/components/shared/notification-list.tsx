import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, PressableFeedback, Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { EmptyState } from "@/components/admin/admin-ui";
import { LoadingState } from "@/components/feedback/loading-state";
import type { IconName } from "@/components/ui/icon-tile";
import { iconSize, textRole, useBrandColor } from "@/design-system";
import {
  type AppNotification,
  groupByDay,
  type NotificationType,
} from "@/features/notifications/notification";

const ICONS: Record<NotificationType, IconName> = {
  "appointment-booked": "calendar-check-outline",
  "appointment-affected": "calendar-alert",
  "queue-called": "bullhorn-outline",
  "queue-called-again": "bullhorn-outline",
  "queue-held": "pause-circle-outline",
  "queue-resumed": "play-circle-outline",
  "patient-checked-in": "account-check-outline",
};

function timeLabel(date: Date, now: Date): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function NotificationRow({
  item,
  now,
  onPress,
}: {
  item: AppNotification;
  now: Date;
  onPress: () => void;
}): JSX.Element {
  const vivid = useBrandColor("brand-vivid");
  const time = timeLabel(item.createdAt, now);
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? "" : "Unread. "}${item.title}. ${item.body}. ${time}`}
      className="rounded-3xl"
    >
      <View
        className={`flex-row gap-3 rounded-3xl border p-4 ${
          item.read ? "border-border bg-surface" : "border-brand-subtle bg-brand-subtle/40"
        }`}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-brand-subtle">
          <MaterialCommunityIcons name={ICONS[item.type]} size={iconSize.md} color={vivid} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Typography
              type={textRole.bodyStrong.type}
              weight={item.read ? "medium" : "semibold"}
              className="flex-1"
              numberOfLines={1}
            >
              {item.title}
            </Typography>
            <Typography type={textRole.caption.type} color="muted">
              {time}
            </Typography>
          </View>
          <Typography type={textRole.supporting.type} color="muted">
            {item.body}
          </Typography>
        </View>
        {item.read ? null : (
          <View className="mt-1.5 size-2.5 rounded-full bg-brand-vivid" accessible={false} />
        )}
      </View>
    </PressableFeedback>
  );
}

/** The in-app notification center: Today / Earlier, newest first. */
export function NotificationList({
  status,
  notifications,
  unreadCount,
  now,
  onOpen,
  onMarkAllRead,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  notifications: readonly AppNotification[];
  unreadCount: number;
  now: Date;
  onOpen: (item: AppNotification) => void;
  onMarkAllRead: () => void;
  onRetry: () => void;
}): JSX.Element {
  if (status === "loading") return <LoadingState title="Loading notifications" />;
  if (status === "error") {
    return (
      <EmptyState
        icon="wifi-off"
        title="Couldn't load notifications"
        description="Check your connection and try again."
        action={{ label: "Try again", onPress: onRetry }}
      />
    );
  }
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="bell-outline"
        title="No notifications yet"
        description="Bookings, reminders and queue updates will appear here."
      />
    );
  }
  return (
    <View className="gap-5">
      {unreadCount > 0 ? (
        <View className="flex-row items-center justify-between">
          <Typography type={textRole.supporting.type} color="muted">
            {unreadCount} unread
          </Typography>
          <Button size="sm" variant="ghost" onPress={onMarkAllRead} hitSlop={6}>
            <Button.Label className="text-brand-text">Mark all as read</Button.Label>
          </Button>
        </View>
      ) : null}
      {groupByDay(notifications, now).map((group) => (
        <View key={group.title} className="gap-2">
          <Typography
            type={textRole.eyebrow.type}
            weight={textRole.eyebrow.weight}
            className={textRole.eyebrow.className}
            accessibilityRole="header"
          >
            {group.title}
          </Typography>
          {group.items.map((item) => (
            <NotificationRow key={item.id} item={item} now={now} onPress={() => onOpen(item)} />
          ))}
        </View>
      ))}
    </View>
  );
}
