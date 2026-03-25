export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATION_KEY_PREFIX = "bb_notifications_";
const NOTIFICATION_EVENT = "bb-notifications-updated";
const MAX_NOTIFICATIONS = 100;

const getNotificationKey = (userId: string) => `${NOTIFICATION_KEY_PREFIX}${userId}`;

const emitNotificationUpdate = (userId: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: { userId } }));
};

export const getNotifications = (userId: string): NotificationItem[] => {
  try {
    const saved = localStorage.getItem(getNotificationKey(userId));
    if (!saved) return [];
    const parsed = JSON.parse(saved) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveNotifications = (userId: string, notifications: NotificationItem[]) => {
  localStorage.setItem(getNotificationKey(userId), JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  emitNotificationUpdate(userId);
};

export const addNotification = (
  userId: string,
  payload: Omit<NotificationItem, "id" | "isRead" | "createdAt">,
): NotificationItem => {
  const notification: NotificationItem = {
    id: crypto.randomUUID(),
    title: payload.title,
    message: payload.message,
    type: payload.type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  const current = getNotifications(userId);
  saveNotifications(userId, [notification, ...current]);
  return notification;
};

export const markNotificationAsRead = (userId: string, notificationId: string) => {
  const current = getNotifications(userId);
  const updated = current.map((entry) => (entry.id === notificationId ? { ...entry, isRead: true } : entry));
  saveNotifications(userId, updated);
};

export const markAllNotificationsAsRead = (userId: string) => {
  const current = getNotifications(userId);
  const updated = current.map((entry) => ({ ...entry, isRead: true }));
  saveNotifications(userId, updated);
};

export const notificationsEventName = NOTIFICATION_EVENT;
