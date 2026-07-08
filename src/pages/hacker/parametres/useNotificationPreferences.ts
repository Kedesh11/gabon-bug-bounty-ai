import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { addNotification } from "@/lib/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "./types";

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );

  useEffect(() => {
    if (!user) return;

    const prefKey = `bb_notify_prefs_${user.id}`;
    const savedPrefs = localStorage.getItem(prefKey);
    if (!savedPrefs) {
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      return;
    }
    try {
      const parsed = JSON.parse(savedPrefs) as Partial<NotificationPreferences>;
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed });
    } catch {
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    }
  }, [user]);

  const setNotificationPreference = <K extends keyof NotificationPreferences>(
    field: K,
    value: NotificationPreferences[K],
  ) => {
    setNotificationPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const saveNotificationPreferences = () => {
    if (!user) return;
    const key = `bb_notify_prefs_${user.id}`;
    localStorage.setItem(key, JSON.stringify(notificationPreferences));
    addNotification(user.id, {
      title: "Préférences notifications mises à jour",
      message: "Vos réglages de notification ont été enregistrés.",
      type: "info",
    });
    toast.success("Préférences notifications enregistrées");
  };

  const sendTestNotification = () => {
    if (!user) return;
    if (!notificationPreferences.inAppEnabled) {
      toast.error("Activez d'abord les notifications in-app");
      return;
    }
    addNotification(user.id, {
      title: "Notification de test",
      message: "Le système de notification fonctionne correctement.",
      type: "success",
    });
    toast.success("Notification de test envoyée");
  };

  return {
    notificationPreferences,
    setNotificationPreference,
    saveNotificationPreferences,
    sendTestNotification,
  };
}
