import { createContext } from "react";
import { User } from "@/types/auth";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  // Self-registration only ever creates a hacker or entreprise account (matches the
  // backend's registerSchema) — staff/custom roles are assigned by an admin, not signup.
  register: (name: string, email: string, password: string, role: "hacker" | "entreprise") => Promise<User>;
  updateProfile: (data: Partial<Pick<User, "name" | "avatar">>) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
