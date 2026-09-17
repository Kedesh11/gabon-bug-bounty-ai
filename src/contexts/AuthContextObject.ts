import { createContext } from "react";
import { User } from "@/types/auth";

// login() can no longer just resolve to a User: a verified TOTP factor makes the
// backend respond mfaRequired instead of a session (see auth.routes.ts's /login) —
// the caller must collect a code and finish with verifyLoginMfa before there's a User.
// `status` (not a boolean flag) is deliberate: this project builds with strict:false,
// under which a boolean-literal discriminant (`mfaRequired: true | false`) doesn't
// narrow a union at all — TypeScript widens it to `boolean` and every branch still
// sees the full union. A string-literal discriminant narrows correctly either way.
export type LoginResult =
  | { status: "success"; user: User }
  | { status: "mfa_required"; factorId: string; aal1AccessToken: string };

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginMfa: (factorId: string, code: string, aal1AccessToken: string) => Promise<User>;
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
  // Adopts the aal2 session GoTrue returns once a TOTP code confirms enrollment —
  // the caller's previous access token stops being current the moment this succeeds.
  confirmMfaEnrollment: (factorId: string, code: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
