import { createContext, type JSX, type ReactNode, use, useEffect, useMemo, useState } from "react";

import { useSession } from "@/features/auth/session";
import { notificationRepository } from "@/lib/backend";

import type { AppNotification } from "./notification";

type NotificationsValue = {
  status: "loading" | "ready" | "error";
  notifications: readonly AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  retry: () => void;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

type State = {
  userId: string | null;
  status: NotificationsValue["status"];
  notifications: AppNotification[];
};

/**
 * One live subscription to the signed-in user's inbox, shared by the bell
 * badges, the notification center and the phone-alert bridge. Data is
 * tagged with its user so a new sign-in never shows the previous inbox.
 */
export function NotificationsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>({ userId: null, status: "loading", notifications: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    return notificationRepository.watchMine(
      userId,
      (notifications) => setState({ userId, status: "ready", notifications }),
      () => setState((current) => ({ ...current, userId, status: "error" }))
    );
  }, [userId, attempt]);

  const value = useMemo<NotificationsValue>(() => {
    const mine = state.userId === userId;
    const notifications = mine ? state.notifications : [];
    const unread = notifications.filter((item) => !item.read);
    return {
      status: mine ? state.status : "loading",
      notifications,
      unreadCount: unread.length,
      markRead: (id) => notificationRepository.markRead(id),
      markAllRead: () =>
        unread.length > 0
          ? notificationRepository.markAllRead(unread.map((item) => item.id))
          : Promise.resolve(),
      retry: () => setAttempt((count) => count + 1),
    };
  }, [state, userId]);

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
}

export function useNotifications(): NotificationsValue {
  const value = use(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationsProvider.");
  return value;
}
