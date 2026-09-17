import { createContext } from "react";
import { User } from "@/types/auth";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  // Self-registration only ever creates a hacker or entreprise account (matches the
  // backend's registerSchema) — staff/custom roles are assigned by an admin, not signup.
  // Returns no User: the account isn't usable yet until its email is confirmed (see
  // verifyEmail below), so there is nothing to log the caller into at this point.
  register: (name: string, email: string, password: string, role: "hacker" | "entreprise") => Promise<{ emailSent: boolean }>;
  updateProfile: (data: Partial<Pick<User, "name" | "avatar" | "notificationPreferences">>) => Promise<User>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
