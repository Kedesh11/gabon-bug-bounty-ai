import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type UserRole = "hacker" | "entreprise" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Demo accounts
const DEMO_USERS: User[] = [
  { id: "admin-1", email: "admin@bugbounty.ga", name: "Admin Principal", role: "admin", createdAt: "2024-01-01" },
  { id: "hacker-1", email: "hacker@bugbounty.ga", name: "CyberPanther", role: "hacker", createdAt: "2024-03-15" },
  { id: "entreprise-1", email: "entreprise@bugbounty.ga", name: "Ministère Numérique", role: "entreprise", createdAt: "2024-02-10" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bugbounty_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, _password: string) => {
    const found = DEMO_USERS.find((u) => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem("bugbounty_user", JSON.stringify(found));
      return true;
    }
    // Allow any login in demo mode
    const demoUser: User = {
      id: crypto.randomUUID(),
      email,
      name: email.split("@")[0],
      role: "hacker",
      createdAt: new Date().toISOString(),
    };
    setUser(demoUser);
    localStorage.setItem("bugbounty_user", JSON.stringify(demoUser));
    return true;
  }, []);

  const register = useCallback((name: string, email: string, _password: string, role: UserRole) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    localStorage.setItem("bugbounty_user", JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("bugbounty_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
