import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { addNotification } from "@/lib/notifications";
import { apiErrorMessage } from "@/lib/apiClient";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "./types";

export function useNotificationPreferences() {
  const { user, updateProfile } = useAuth();
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Real backend value (Profile.notificationPreferences) replaces the old
  // localStorage-only copy — lost on a new device/browser before this.
  useEffect(() => {
    if (!user) return;
    setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...user.notificationPreferences });
  }, [user]);

  const setNotificationPreference = <K extends keyof NotificationPreferences>(
    field: K,
    value: NotificationPreferences[K],
  ) => {
    setNotificationPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const saveNotificationPreferences = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile({ notificationPreferences });
      addNotification(user.id, {
        title: "Préférences notifications mises à jour",
        message: "Vos réglages de notification ont été enregistrés.",
        type: "info",
      });
      toast.success("Préférences notifications enregistrées");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
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
    isSaving,
  };
}
