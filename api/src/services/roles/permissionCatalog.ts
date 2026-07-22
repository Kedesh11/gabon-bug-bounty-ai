// Fixed catalog of permission keys — something in the route code has to know what each
// key gates, so unlike roles these are not admin-editable. What's dynamic is which roles
// have which of these permissions (see rolesService.ts): granting an existing permission
// to a brand-new role requires zero code changes or deploy.
//
// Two families:
//  - action permissions: gate a specific API mutation (1:1 with what used to be a
//    `requireRole(...)` call before the roles/permissions migration).
//  - view permissions: gate access to an admin-side page/nav item (frontend
//    ProtectedRoute + DashboardLayout nav). Hacker/entreprise pages are NOT
//    permission-gated — those two roles are tied to a structural sub-profile
//    (HackerProfile/EntrepriseProfile), not a staff permission set, so they stay
//    gated by role key.
export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export const PERMISSIONS: PermissionDef[] = [
  // Action permissions (backend route guards)
  { key: "config.write", label: "Modifier la configuration système", description: "PATCH /api/config" },
  { key: "hackers.self.manage", label: "Gérer son propre profil hacker", description: "Config de paiement et spécialités du hacker connecté" },
  { key: "hackers.manage", label: "Administrer les hackers", description: "Modifier/supprimer n'importe quel profil hacker" },
  { key: "payouts.create", label: "Déclencher un versement", description: "POST /api/payouts/reports/:id" },
  { key: "payments.fund", label: "Financer un programme", description: "POST /api/payments/programmes/:id/fund" },
  { key: "payments.onboarding.self", label: "Onboarding paiement (hacker)", description: "POST /api/payments/onboarding/stripe" },
  { key: "entreprises.manage", label: "Administrer les entreprises", description: "Lister/supprimer les profils entreprise" },
  { key: "system.status.read", label: "Voir l'état du système", description: "GET /api/system-status" },
  { key: "programmes.create", label: "Créer un programme", description: "POST /api/programmes" },
  { key: "programmes.update", label: "Modifier un programme", description: "PATCH /api/programmes/:id" },
  { key: "programmes.delete", label: "Supprimer un programme", description: "DELETE /api/programmes/:id" },
  { key: "reports.create", label: "Soumettre un rapport", description: "POST /api/reports" },
  { key: "reports.view.all", label: "Voir tous les rapports", description: "GET /api/reports/:id sur un rapport qui n'est pas le sien (accès staff en lecture)" },
  { key: "reports.triage", label: "Trier les rapports", description: "PATCH /api/reports/:id (statut, sévérité, récompense)" },
  { key: "reports.delete", label: "Supprimer un rapport", description: "DELETE /api/reports/:id" },
  { key: "roles.manage", label: "Administrer les rôles", description: "CRUD des rôles et de leurs permissions" },
  { key: "fraud.review", label: "Examiner les signaux de fraude", description: "Lister/traiter les signaux, lancer une analyse (POST /api/fraud/*)" },
  { key: "taxonomy.manage", label: "Administrer la taxonomie des vulnérabilités", description: "Créer/modifier/supprimer des catégories, compléter celles proposées par des hackers (CWE, sévérité, hiérarchie)" },
  { key: "content.manage", label: "Administrer le contenu du site", description: "CRUD navbar/footer/contenu de page (POST/PATCH/DELETE /api/content/*)" },
  { key: "tickets.manage", label: "Gérer les tickets support", description: "Répondre, résoudre ou supprimer un ticket support (POST/PATCH/DELETE /api/tickets/*)" },
  { key: "kyc.review", label: "Examiner les documents KYC", description: "Approuver ou rejeter un document d'identité soumis (PATCH /api/kyc/documents/:id)" },

  // View permissions (frontend pages/nav — admin side only)
  { key: "dashboard.admin.view", label: "Voir le tableau de bord admin", description: "/admin" },
  { key: "dashboard.triage.view", label: "Voir le tableau de bord triage", description: "/admin/triage" },
  { key: "dashboard.finance.view", label: "Voir le tableau de bord finance", description: "/admin/finance" },
  { key: "dashboard.support.view", label: "Voir le tableau de bord support", description: "/admin/support" },
  { key: "users.view", label: "Voir les utilisateurs", description: "/admin/utilisateurs et le détail d'un utilisateur" },
  { key: "programmes.manage.view", label: "Voir la gestion des programmes", description: "/admin/programmes" },
  { key: "reports.manage.view", label: "Voir la gestion des rapports", description: "/admin/rapports" },
  { key: "logs.view", label: "Voir les logs plateforme", description: "/admin/logs" },
  { key: "support.tickets.view", label: "Voir les tickets support", description: "/admin/support/ticket/:id" },
  { key: "support.kb.view", label: "Voir la base de connaissances support", description: "/admin/support/kb" },
  { key: "settings.view", label: "Voir les paramètres plateforme", description: "/admin/parametres" },
];

// Preserves current behaviour exactly: every role gets precisely the permissions its
// requireRole(...)/ProtectedRoute allow-lists granted it before this migration.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.key),
  hacker: ["hackers.self.manage", "payments.onboarding.self", "reports.create"],
  entreprise: ["payments.fund", "programmes.create", "programmes.update"],
  triage: ["reports.triage", "reports.view.all", "dashboard.triage.view", "reports.manage.view", "settings.view"],
  // Finance already had reports.triage via the old requireRole("admin","triage","finance")
  // even though /admin/rapports was never in finance's frontend nav — preserved as-is,
  // not "fixed", since this migration must not change existing behaviour.
  finance: ["payouts.create", "reports.triage", "reports.view.all", "dashboard.finance.view", "settings.view"],
  // Support had no reports.* action permission before, but canView() let it read any
  // report via the API (role === "support" was in its hardcoded allow-list) — preserved.
  support: ["reports.view.all", "dashboard.support.view", "users.view", "logs.view", "support.tickets.view", "support.kb.view", "settings.view", "tickets.manage", "fraud.review", "kyc.review"],
};

export const SYSTEM_ROLE_KEYS = Object.keys(DEFAULT_ROLE_PERMISSIONS);
