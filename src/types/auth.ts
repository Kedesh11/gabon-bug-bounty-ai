export type UserRole = "hacker" | "entreprise" | "admin" | "triage" | "finance" | "support";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  // Ids of the role-specific sub-profile (HackerProfile/EntrepriseProfile), distinct from
  // `id` (the auth/Profile id) — Programme.entrepriseId and Report.hackerId reference these,
  // not the auth id, so any ownership comparison must use these fields instead of `id`.
  hackerProfileId?: string;
  entrepriseProfileId?: string;
}
