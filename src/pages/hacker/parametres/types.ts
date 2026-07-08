export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  paymentAlerts: boolean;
  reportStatusAlerts: boolean;
  securityAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: false,
  paymentAlerts: true,
  reportStatusAlerts: true,
  securityAlerts: true,
};
