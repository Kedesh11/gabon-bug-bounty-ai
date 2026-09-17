import { useState, ReactNode, useCallback, useEffect } from "react";
import { User, NotificationPreferences } from "@/types/auth";
import { AuthContext, LoginResult } from "./AuthContextObject";
import { apiFetch, getSession, setSession, Session } from "@/lib/apiClient";

interface ApiProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  permissions: string[];
  avatar?: string | null;
  createdAt: string;
  hackerProfile?: { id: string } | null;
  entrepriseProfile?: { id: string } | null;
  notificationPreferences?: NotificationPreferences | null;
}

interface MfaFields {
  mfaEnabled?: boolean;
  mfaEnrollmentRequired?: boolean;
}

function toUser(profile: ApiProfile, mfaFields: MfaFields = {}): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    roleLabel: profile.roleLabel,
    permissions: profile.permissions,
    avatar: profile.avatar ?? undefined,
    createdAt: profile.createdAt,
    hackerProfileId: profile.hackerProfile?.id,
    entrepriseProfileId: profile.entrepriseProfile?.id,
    notificationPreferences: profile.notificationPreferences ?? undefined,
    mfaEnabled: mfaFields.mfaEnabled,
    mfaEnrollmentRequired: mfaFields.mfaEnrollmentRequired,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getSession()) {
        setIsLoading(false);
        return;
      }
      try {
        const { profile, mfaEnabled, mfaEnrollmentRequired } = await apiFetch<{
          profile: ApiProfile;
          mfaEnabled: boolean;
          mfaEnrollmentRequired: boolean;
        }>("/api/auth/me");
        if (!cancelled) setUser(toUser(profile, { mfaEnabled, mfaEnrollmentRequired }));
      } catch {
        setSession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await apiFetch<{
      profile?: ApiProfile;
      session?: Session;
      mfaEnrollmentRequired?: boolean;
      mfaRequired?: boolean;
      factorId?: string;
      aal1AccessToken?: string;
    }>("/api/auth/login", { method: "POST", body: { email, password } });

    if (res.mfaRequired) {
      // Not a session yet — password was right, but a verified TOTP factor means the
      // caller must finish with verifyLoginMfa before there's a user to log in as.
      return { status: "mfa_required", factorId: res.factorId!, aal1AccessToken: res.aal1AccessToken! };
    }

    setSession(res.session!);
    const loggedUser = toUser(res.profile!, { mfaEnabled: false, mfaEnrollmentRequired: res.mfaEnrollmentRequired });
    setUser(loggedUser);
    return { status: "success", user: loggedUser };
  }, []);

  const verifyLoginMfa = useCallback(async (factorId: string, code: string, aal1AccessToken: string) => {
    const { profile, session } = await apiFetch<{ profile: ApiProfile; session: Session }>("/api/auth/mfa/login-verify", {
      method: "POST",
      body: { factorId, code, aal1AccessToken },
    });
    setSession(session);
    // A factor was just used to authenticate, so both are necessarily true — no
    // extra round trip to /me needed just to learn what this call already proves.
    const loggedUser = toUser(profile, { mfaEnabled: true, mfaEnrollmentRequired: false });
    setUser(loggedUser);
    return loggedUser;
  }, []);

  // No session returned: Supabase itself now refuses signInWithPassword until the
  // account is confirmed (auth.email.enable_confirmations = true), so there is
  // nothing to log the caller into yet — see Inscription.tsx for the "check your
  // email" screen this leads into instead of an immediate dashboard redirect.
  const register = useCallback(async (name: string, email: string, password: string, role: "hacker" | "entreprise") => {
    const { emailSent } = await apiFetch<{ emailSent: boolean }>("/api/auth/register", {
      method: "POST",
      body: { name, email, password, role },
    });
    return { emailSent };
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<User, "name" | "avatar" | "notificationPreferences">>) => {
    const { profile } = await apiFetch<{ profile: ApiProfile }>("/api/auth/me", { method: "PATCH", body: data });
    // PATCH /me doesn't echo the MFA fields back — carry the current ones forward via
    // the updater's `prev` rather than the closed-over `user`, which could be stale.
    let updatedUser!: User;
    setUser((prev) => {
      updatedUser = toUser(profile, { mfaEnabled: prev?.mfaEnabled, mfaEnrollmentRequired: prev?.mfaEnrollmentRequired });
      return updatedUser;
    });
    return updatedUser;
  }, []);

  const logout = useCallback(() => {
    if (getSession()) {
      // Fire while the session is still attached so the Bearer token actually reaches the
      // server for revocation; client-side state is cleared immediately after regardless.
      apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
    setSession(null);
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, password } });
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    await apiFetch("/api/auth/verify-email", { method: "POST", body: { token } });
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await apiFetch("/api/auth/resend-verification", { method: "POST", body: { email } });
  }, []);

  const confirmMfaEnrollment = useCallback(async (factorId: string, code: string) => {
    const { session } = await apiFetch<{ session: Session }>("/api/auth/mfa/enroll/confirm", {
      method: "POST",
      body: { factorId, code },
    });
    setSession(session);
    setUser((prev) => (prev ? { ...prev, mfaEnabled: true, mfaEnrollmentRequired: false } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyLoginMfa,
        register,
        updateProfile,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        confirmMfaEnrollment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
