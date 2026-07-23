// A role key is just a string now (dynamic, admin-manageable — see /admin/roles), not a
// fixed union. What's still fixed is the permission catalog (permissions gate behaviour,
// roles are just named bundles of them) — see src/lib/permissions.ts.
export type UserRole = string;

export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  paymentAlerts: boolean;
  reportStatusAlerts: boolean;
  securityAlerts: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  permissions: string[];
  avatar?: string;
  createdAt: string;
  // Ids of the role-specific sub-profile (HackerProfile/EntrepriseProfile), distinct from
  // `id` (the auth/Profile id) — Programme.entrepriseId and Report.hackerId reference these,
  // not the auth id, so any ownership comparison must use these fields instead of `id`.
  hackerProfileId?: string;
  entrepriseProfileId?: string;
  notificationPreferences?: NotificationPreferences;
}
