import type { NotificationRepository } from "./notification";

/** Without a backend there is no inbox: an empty, read-only center. */
export const unavailableNotificationRepository: NotificationRepository = {
  watchMine: (_userId, onChange) => {
    onChange([]);
    return () => undefined;
  },
  markRead: () => Promise.resolve(),
  markAllRead: () => Promise.resolve(),
};
