import { Shield, LogOut, Home, FileText, Bug, Users, Building2, BarChart3, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useState } from "react";

const NAV_ITEMS: Record<UserRole, { label: string; path: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Tableau de bord", path: "/admin", icon: BarChart3 },
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
    { label: "Programmes", path: "/admin/programmes", icon: FileText },
    { label: "Rapports", path: "/admin/rapports", icon: Bug },
    { label: "Paramètres", path: "/admin/parametres", icon: Settings },
  ],
  hacker: [
    { label: "Tableau de bord", path: "/hacker", icon: BarChart3 },
    { label: "Programmes", path: "/hacker/programmes", icon: FileText },
    { label: "Mes rapports", path: "/hacker/rapports", icon: Bug },
    { label: "Profil", path: "/hacker/profil", icon: Users },
  ],
  entreprise: [
    { label: "Tableau de bord", path: "/entreprise", icon: BarChart3 },
    { label: "Mes programmes", path: "/entreprise/programmes", icon: FileText },
    { label: "Rapports reçus", path: "/entreprise/rapports", icon: Bug },
    { label: "Paramètres", path: "/entreprise/parametres", icon: Settings },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  hacker: "Hacker Éthique",
  entreprise: "Entreprise",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS[user.role];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-black text-foreground">BugBounty<span className="text-primary">.ga</span></span>
        </Link>
      </div>

      <div className="p-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{ROLE_LABELS[user.role]}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Home className="w-4 h-4" />
          Site public
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col fixed h-screen">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-card border-r border-border z-10">
            <Button
              variant="ghost" size="icon"
              className="absolute top-3 right-3 text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-40">
          <Button variant="ghost" size="icon" className="lg:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground">
            {items.find(i => i.path === location.pathname)?.label || "Dashboard"}
          </h2>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
