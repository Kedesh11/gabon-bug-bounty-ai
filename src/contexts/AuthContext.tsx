import { useState, ReactNode, useCallback, useEffect } from "react";
import { User, NotificationPreferences } from "@/types/auth";
import { AuthContext } from "./AuthContextObject";
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

function toUser(profile: ApiProfile): User {
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
        const { profile } = await apiFetch<{ profile: ApiProfile }>("/api/auth/me");
        if (!cancelled) setUser(toUser(profile));
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

  const login = useCallback(async (email: string, password: string) => {
    const { profile, session } = await apiFetch<{ profile: ApiProfile; session: Session }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setSession(session);
    const loggedUser = toUser(profile);
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
    const updatedUser = toUser(profile);
    setUser(updatedUser);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
