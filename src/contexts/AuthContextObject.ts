import { createContext } from "react";
import { User, UserRole } from "@/types/auth";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<User>;
  updateProfile: (data: Partial<Pick<User, "name" | "avatar">>) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
