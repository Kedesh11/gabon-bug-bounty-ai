import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { UserRole } from "@/types/auth";

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return <Navigate to="/connexion" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
