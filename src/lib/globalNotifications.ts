// Platform-wide alerts shown to every logged-in user (any role), as opposed to the
// per-user notifications in ./notifications.ts. Whether they're actually surfaced is
// gated by SystemConfig's "Notifications Globales" toggle (Configuration Système,
// dashboard admin) — see DashboardLayout, which only merges these in when
// globalNotificationsEnabled is true.
import { NotificationItem, NotificationType } from "./notifications";

const GLOBAL_KEY = "bb_notifications_global";
const GLOBAL_EVENT = "bb-global-notifications-updated";
const MAX_NOTIFICATIONS = 100;

const emitGlobalNotificationUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GLOBAL_EVENT));
};

export const getGlobalNotifications = (): NotificationItem[] => {
  try {
    const saved = localStorage.getItem(GLOBAL_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveGlobalNotifications = (notifications: NotificationItem[]) => {
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  emitGlobalNotificationUpdate();
};

export const broadcastGlobalNotification = (payload: {
  title: string;
  message: string;
  type: NotificationType;
}): NotificationItem => {
  const notification: NotificationItem = {
    id: crypto.randomUUID(),
    title: payload.title,
    message: payload.message,
    type: payload.type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  saveGlobalNotifications([notification, ...getGlobalNotifications()]);
  return notification;
};

export const markGlobalNotificationAsRead = (notificationId: string) => {
  const updated = getGlobalNotifications().map((entry) =>
    entry.id === notificationId ? { ...entry, isRead: true } : entry,
  );
  saveGlobalNotifications(updated);
};

export const markAllGlobalNotificationsAsRead = () => {
  const updated = getGlobalNotifications().map((entry) => ({ ...entry, isRead: true }));
  saveGlobalNotifications(updated);
};

export const globalNotificationsEventName = GLOBAL_EVENT;
export const globalNotificationsStorageKey = GLOBAL_KEY;
