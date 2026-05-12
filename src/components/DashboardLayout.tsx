import { Shield, LogOut, Home, FileText, Bug, Users, BarChart3, Settings, Menu, X, Bell, CheckCheck, UserCircle2, DollarSign, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { UserRole } from "@/types/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, notificationsEventName, type NotificationItem } from "@/lib/notifications";

const NAV_ITEMS: Record<UserRole, { label: string; path: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Tableau de bord", path: "/admin", icon: BarChart3 },
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
    { label: "Programmes", path: "/admin/programmes", icon: FileText },
    { label: "Rapports", path: "/admin/rapports", icon: Bug },
    { label: "Logs Système", path: "/admin/logs", icon: Terminal },
    { label: "Paramètres", path: "/admin/parametres", icon: Settings },
  ],
  hacker: [
    { label: "Tableau de bord", path: "/hacker", icon: BarChart3 },
    { label: "Programmes", path: "/hacker/programmes", icon: FileText },
    { label: "Mes rapports", path: "/hacker/rapports", icon: Bug },
    { label: "Profil", path: "/hacker/profil", icon: Users },
    { label: "Paramètres", path: "/hacker/parametres", icon: Settings },
  ],
  entreprise: [
    { label: "Tableau de bord", path: "/entreprise", icon: BarChart3 },
    { label: "Mes programmes", path: "/entreprise/programmes", icon: FileText },
    { label: "Rapports reçus", path: "/entreprise/rapports", icon: Bug },
    { label: "Paramètres", path: "/entreprise/parametres", icon: Settings },
  ],
  triage: [
    { label: "Dashboard Triage", path: "/admin/triage", icon: BarChart3 },
    { label: "Rapports", path: "/admin/rapports", icon: Bug },
    { label: "Paramètres", path: "/admin/parametres", icon: Settings },
  ],
  finance: [
    { label: "Dashboard Finance", path: "/admin/finance", icon: BarChart3 },
    { label: "Rapports Financiers", path: "/admin/finance", icon: DollarSign },
    { label: "Paramètres", path: "/admin/parametres", icon: Settings },
  ],
  support: [
    { label: "Dashboard Support", path: "/admin/support", icon: BarChart3 },
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
    { label: "Logs Plateforme", path: "/admin/logs", icon: Terminal },
    { label: "Paramètres", path: "/admin/parametres", icon: Settings },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  hacker: "Chercheur Élite",
  entreprise: "Partenaire Entreprise",
  triage: "Responsable Triage",
  finance: "Gestionnaire Finance",
  support: "Support Technique",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const userId = user?.id ?? "";
  const items = user ? NAV_ITEMS[user.role] : [];
  const unreadCount = useMemo(() => notifications.filter((entry) => !entry.isRead).length, [notifications]);

  const reloadNotifications = useCallback(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setNotifications(getNotifications(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    reloadNotifications();

    const handleCustomUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) {
        reloadNotifications();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === `bb_notifications_${userId}`) {
        reloadNotifications();
      }
    };

    window.addEventListener(notificationsEventName, handleCustomUpdate as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(notificationsEventName, handleCustomUpdate as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [reloadNotifications, userId]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-black text-foreground">BugBounty</span>
        </Link>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
              <UserCircle2 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
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
            {items.find(i => i.path === location.pathname)?.label || "Tableau de bord"}
          </h2>
          <div className="ml-auto relative">
            <Button variant="ghost" size="icon" className="text-foreground relative" onClick={() => setNotificationsOpen((prev) => !prev)}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[340px] max-w-[85vw] rounded-xl border border-border bg-card shadow-xl p-3 space-y-3 z-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      markAllNotificationsAsRead(user.id);
                      reloadNotifications();
                    }}
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Tout lire
                  </Button>
                </div>
                <div className="max-h-72 overflow-auto space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          markNotificationAsRead(user.id, entry.id);
                          reloadNotifications();
                        }}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          entry.isRead ? "border-border bg-secondary/40" : "border-primary/30 bg-primary/10"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.message}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-2">
                          {new Date(entry.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">Aucune notification</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
