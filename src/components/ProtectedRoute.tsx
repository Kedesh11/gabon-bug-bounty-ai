import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Hacker/entreprise routes gate by role key (those two roles are tied to a structural
  // sub-profile, not a staff permission set). Admin-side routes gate by permission instead,
  // so a new role granted the right permission gets access with no code change.
  roles?: UserRole[];
  permissions?: string[];
}

export default function ProtectedRoute({ children, roles, permissions }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/connexion" replace />;

  if (permissions && !permissions.some((p) => user.permissions.includes(p))) {
    return <Navigate to="/" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
