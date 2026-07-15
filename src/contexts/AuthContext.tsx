import { useState, ReactNode, useCallback, useEffect } from "react";
import { User, UserRole } from "@/types/auth";
import { AuthContext } from "./AuthContextObject";
import { apiFetch, getSession, setSession, Session } from "@/lib/apiClient";

interface ApiProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  createdAt: string;
  hackerProfile?: { id: string } | null;
  entrepriseProfile?: { id: string } | null;
}

function toUser(profile: ApiProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    avatar: profile.avatar ?? undefined,
    createdAt: profile.createdAt,
    hackerProfileId: profile.hackerProfile?.id,
    entrepriseProfileId: profile.entrepriseProfile?.id,
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

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    const { profile, session } = await apiFetch<{ profile: ApiProfile; session: Session }>("/api/auth/register", {
      method: "POST",
      body: { name, email, password, role },
    });
    setSession(session);
    const createdUser = toUser(profile);
    setUser(createdUser);
    return createdUser;
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<User, "name" | "avatar">>) => {
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

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, updateProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
