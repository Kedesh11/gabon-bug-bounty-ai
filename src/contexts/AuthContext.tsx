import { useState, ReactNode, useCallback, useMemo } from "react";
import { User, UserRole } from "@/types/auth";
import { AuthContext } from "./AuthContextObject";

const REGISTERED_USERS_KEY = "bugbounty_registered_users";
const ENTERPRISE_REGISTERED_KEY = "bugbounty_has_registered_enterprise";

const DEMO_USERS: User[] = [
  { id: "admin-1", email: "admin@bugbounty.com", name: "Admin Principal", role: "admin", createdAt: "2024-01-01" },
  { id: "hacker-1", email: "hacker@bugbounty.com", name: "CyberPanther", role: "hacker", createdAt: "2024-03-15" },
  { id: "entreprise-1", email: "entreprise@bugbounty.com", name: "Ministère Numérique", role: "entreprise", createdAt: "2024-02-10" },
  { id: "entreprise-3", email: "security@seeg.ga", name: "SEEG Gabon", role: "entreprise", createdAt: "2024-07-15" },
  { id: "triage-1", email: "triage@bugbounty.com", name: "Sarah (Triage)", role: "triage", createdAt: "2024-05-01" },
  { id: "finance-1", email: "finance@bugbounty.com", name: "Marc (Finance)", role: "finance", createdAt: "2024-05-01" },
  { id: "support-1", email: "support@bugbounty.com", name: "Paul (Support)", role: "support", createdAt: "2024-05-01" },
];

function loadRegisteredUsers(): User[] {
  try {
    const saved = localStorage.getItem(REGISTERED_USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users: User[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bugbounty_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => loadRegisteredUsers());

  const knownUsers = useMemo(() => [...DEMO_USERS, ...registeredUsers], [registeredUsers]);

  const login = useCallback((email: string, _password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const found = knownUsers.find((knownUser) => knownUser.email.toLowerCase() === normalizedEmail);
    if (found) {
      setUser(found);
      localStorage.setItem("bugbounty_user", JSON.stringify(found));
      localStorage.setItem("bugbounty_last_login_email", found.email);
      if (found.role === "entreprise") {
        localStorage.setItem(ENTERPRISE_REGISTERED_KEY, "true");
      }
      return found;
    }

    // Allow any login in demo mode
    const demoUser: User = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      role: "hacker",
      createdAt: new Date().toISOString(),
    };
    setUser(demoUser);
    localStorage.setItem("bugbounty_user", JSON.stringify(demoUser));
    localStorage.setItem("bugbounty_last_login_email", demoUser.email);
    return demoUser;
  }, [knownUsers]);

  const register = useCallback((name: string, email: string, _password: string, role: UserRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    const newUser: User = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name,
      role,
      createdAt: new Date().toISOString(),
    };

    setRegisteredUsers((previous) => {
      const filtered = previous.filter((existingUser) => existingUser.email.toLowerCase() !== normalizedEmail);
      const updated = [...filtered, newUser];
      saveRegisteredUsers(updated);
      return updated;
    });

    setUser(newUser);
    localStorage.setItem("bugbounty_user", JSON.stringify(newUser));
    localStorage.setItem("bugbounty_last_login_email", newUser.email);
    if (role === "entreprise") {
      localStorage.setItem(ENTERPRISE_REGISTERED_KEY, "true");
    }
    return newUser;
  }, []);

  const updateProfile = useCallback((data: Partial<Pick<User, "name" | "email" | "avatar">>) => {
    if (!user) return null;

    const normalizedName = data.name ? data.name.trim() : user.name;
    const normalizedEmail = data.email ? data.email.trim().toLowerCase() : user.email;
    const normalizedAvatar = data.avatar;

    const emailTaken = knownUsers.some(
      (knownUser) => knownUser.id !== user.id && knownUser.email.toLowerCase() === normalizedEmail.toLowerCase(),
    );
    if (emailTaken) return null;

    const updatedUser: User = {
      ...user,
      name: normalizedName || user.name,
      email: normalizedEmail || user.email,
      avatar: normalizedAvatar !== undefined ? normalizedAvatar : user.avatar,
    };

    setUser(updatedUser);
    localStorage.setItem("bugbounty_user", JSON.stringify(updatedUser));
    localStorage.setItem("bugbounty_last_login_email", updatedUser.email);

    setRegisteredUsers((previous) => {
      const idx = previous.findIndex((entry) => entry.id === user.id || entry.email.toLowerCase() === user.email.toLowerCase());
      if (idx === -1) {
        const updated = [...previous, updatedUser];
        saveRegisteredUsers(updated);
        return updated;
      }

      const updated = previous.map((entry, index) => (index === idx ? { ...entry, ...updatedUser } : entry));
      saveRegisteredUsers(updated);
      return updated;
    });

    return updatedUser;
  }, [knownUsers, user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("bugbounty_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
