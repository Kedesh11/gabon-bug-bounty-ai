import { BarChart3, Users, FileText, Bug, Terminal, Settings, ShieldAlert, type LucideIcon } from "lucide-react";
import { User } from "@/types/auth";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission: string;
}

// Staff-side (admin/triage/finance/support/any custom role) nav — filtered per user by
// permission, so a brand-new role sees the right pages automatically once granted a
// permission from /admin/roles, with zero code change. Hacker/entreprise have their own
// fixed nav (DashboardLayout) since those two are tied to a structural sub-profile
// (HackerProfile/EntrepriseProfile), not a staff permission set.
export const STAFF_NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", path: "/admin", icon: BarChart3, permission: "dashboard.admin.view" },
  { label: "Dashboard Triage", path: "/admin/triage", icon: BarChart3, permission: "dashboard.triage.view" },
  { label: "Dashboard Finance", path: "/admin/finance", icon: BarChart3, permission: "dashboard.finance.view" },
  { label: "Dashboard Support", path: "/admin/support", icon: BarChart3, permission: "dashboard.support.view" },
  { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users, permission: "users.view" },
  { label: "Programmes", path: "/admin/programmes", icon: FileText, permission: "programmes.manage.view" },
  { label: "Rapports", path: "/admin/rapports", icon: Bug, permission: "reports.manage.view" },
  { label: "Logs Système", path: "/admin/logs", icon: Terminal, permission: "logs.view" },
  { label: "Rôles & Permissions", path: "/admin/roles", icon: Users, permission: "roles.manage" },
  { label: "Détection de fraude", path: "/admin/fraude", icon: ShieldAlert, permission: "fraud.review" },
  { label: "Paramètres", path: "/admin/parametres", icon: Settings, permission: "settings.view" },
];

export function getStaffNavItems(user: Pick<User, "permissions">): NavItem[] {
  return STAFF_NAV_ITEMS.filter((item) => user.permissions.includes(item.permission));
}

// Priority order matters: an admin holds every dashboard.*.view permission, so without an
// explicit order there'd be no way to tell which dashboard is "home" for them.
const DASHBOARD_PRIORITY: { permission: string; path: string }[] = [
  { permission: "dashboard.admin.view", path: "/admin" },
  { permission: "dashboard.triage.view", path: "/admin/triage" },
  { permission: "dashboard.finance.view", path: "/admin/finance" },
  { permission: "dashboard.support.view", path: "/admin/support" },
];

export function resolveDashboardPath(user: Pick<User, "role" | "permissions">): string {
  if (user.role === "hacker") return "/hacker";
  if (user.role === "entreprise") return "/entreprise";
  return DASHBOARD_PRIORITY.find((entry) => user.permissions.includes(entry.permission))?.path ?? "/";
}
