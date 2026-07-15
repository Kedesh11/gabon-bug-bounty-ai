import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useMaintenanceStatus } from "@/hooks/api/config";
import MaintenancePage from "@/pages/MaintenancePage";

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

// Gates the entire app behind the maintenance page for everyone except: admins (so they
// can still reach the dashboard to lift it) and the login page itself (so an admin who
// isn't currently authenticated can still get in). Fails open — a slow/failed maintenance
// status check never blocks the site, it just renders normally until it resolves.
export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { data: maintenance } = useMaintenanceStatus();
  const { user, isLoading: authLoading } = useAuth();

  if (!maintenance?.active || pathname === "/connexion") {
    return <>{children}</>;
  }

  if (authLoading) return <Loader />;
  if (user?.role === "admin") return <>{children}</>;

  return <MaintenancePage until={maintenance.maintenanceUntil} />;
}
