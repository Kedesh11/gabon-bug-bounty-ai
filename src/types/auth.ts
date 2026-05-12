export type UserRole = "hacker" | "entreprise" | "admin" | "triage" | "finance" | "support";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}
