import { createContext } from "react";
import { User, UserRole } from "@/types/auth";

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => User | null;
  register: (name: string, email: string, password: string, role: UserRole) => User | null;
  updateProfile: (data: Partial<Pick<User, "name" | "email" | "avatar">>) => User | null;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
