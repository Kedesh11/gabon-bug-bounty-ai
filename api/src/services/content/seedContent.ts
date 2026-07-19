import type { PrismaClient } from "@prisma/client";

// Idempotent: safe to call from both a one-off migration script and the routine
// dev-reset seed (prisma/seed.ts), same pattern as seedVulnerabilityTaxonomy. Seeds
// today's hardcoded Navbar.tsx/FooterSection.tsx links so the first deploy of the
// CMS-backed components looks identical to before.
const DEFAULT_NAVBAR_ITEMS = [
  { label: "Programmes", url: "/programmes" },
  { label: "Soumettre Rapport", url: "/soumettre-rapport" },
  { label: "Hackers", url: "/hackers" },
  { label: "Agents MCP", url: "/mcp-agents" },
  { label: "Documentation", url: "/documentation" },
];

const DEFAULT_FOOTER_LINKS = [
  { label: "Mentions légales", url: "/mentions-legales" },
  { label: "Contact", url: "/contact" },
];

// Phase 2: JSON content entries for pages migrated to useJsonContent(key, fallback).
// Mirrors each page's DEFAULT_* constant exactly (minus icon fields, which stay a
// fixed local mapping in the component — see the "Icons are a display concern"
// comment in each migrated file) so the admin editor starts pre-populated with
// today's real copy instead of an empty key the fallback silently masks.
const DEFAULT_JSON_ENTRIES: Record<string, unknown> = {
  "documentation.sections": [
    {
      id: "introduction",
      title: "Introduction",
      content: [
        { subtitle: "Contexte", text: "La transformation numérique au Gabon s'accompagne d'une exposition accrue aux cybermenaces. Les approches traditionnelles de cybersécurité ne suffisent plus à répondre à la complexité et à la rapidité des attaques modernes. L'intégration de systèmes intelligents et autonomes devient essentielle." },
        { subtitle: "Objectifs de la plateforme", text: "La plateforme BugBounty est un système collaboratif de cybersécurité permettant à des organisations de faire tester leurs systèmes par des hackers éthiques, avec l'appui d'un moteur intelligent basé sur des agents décisionnels (MCP)." },
      ],
    },
    {
      id: "getting-started",
      title: "Démarrage Rapide",
      content: [
        { subtitle: "Pour les Hackers", text: "1. Créez votre compte sur la plateforme\n2. Complétez votre profil et vérifiez votre identité\n3. Parcourez les programmes disponibles\n4. Choisissez un programme et lisez attentivement le scope\n5. Commencez votre recherche de vulnérabilités\n6. Soumettez vos rapports via le formulaire dédié" },
        { subtitle: "Pour les Organisations", text: "1. Inscrivez votre organisation\n2. Définissez le périmètre de test (scope)\n3. Configurez les récompenses par niveau de sévérité\n4. Publiez votre programme\n5. Recevez et traitez les rapports via le tableau de bord" },
      ],
    },
    {
      id: "mcp",
      title: "Agents MCP",
      content: [
        { subtitle: "Architecture", text: "Le système MCP (Multi-Agent Control Platform) est composé de 6 agents spécialisés qui travaillent de manière coordonnée : Agent d'Analyse, Agent de Sévérité, Agent Anti-Fraude, Agent Décisionnel, Agent de Recommandation, et Agent de Récompenses." },
        { subtitle: "Fonctionnement", text: "Chaque rapport soumis passe par le pipeline MCP complet. Les agents communiquent entre eux pour partager les informations, affiner les décisions et réduire les erreurs. Le système s'améliore continuellement grâce à l'apprentissage des décisions passées." },
      ],
    },
    {
      id: "rules",
      title: "Règles & Politiques",
      content: [
        { subtitle: "Règles de divulgation", text: "• Ne testez que les systèmes inclus dans le scope\n• Ne tentez pas d'accéder aux données personnelles\n• Signalez immédiatement toute vulnérabilité critique\n• Ne divulguez pas les vulnérabilités publiquement avant correction\n• Respectez un délai de 90 jours avant divulgation" },
        { subtitle: "Récompenses", text: "Les récompenses sont calculées automatiquement par l'Agent MCP dédié selon : la gravité (CVSS), l'impact métier, la complexité de découverte, et la qualité du rapport. Les paiements sont effectués sous 30 jours après validation." },
      ],
    },
  ],
  "mentions-legales.sections": [
    { title: "Éditeur de la plateforme", content: "BugBounty est une plateforme de coordination en cybersécurité destinée aux organisations et hackers éthiques. Pour toute demande légale, utilisez le formulaire de contact." },
    { title: "Utilisation de la plateforme", content: "Les utilisateurs s'engagent à respecter le cadre légal applicable, le périmètre des programmes publiés et les règles de divulgation responsable." },
    { title: "Protection des données", content: "Les données des comptes, rapports et programmes sont utilisées uniquement pour l'exploitation de la plateforme, l'analyse des vulnérabilités et le suivi des récompenses." },
    { title: "Responsabilité", content: "Toute activité hors périmètre autorisé engage la responsabilité de son auteur. Les organisations restent responsables de la validation finale des rapports soumis." },
  ],
  "home.stats": [
    { id: "bugs", value: "2,847", label: "Vulnérabilités détectées", color: "text-primary" },
    { id: "hackers", value: "1,200+", label: "Hackers éthiques", color: "text-accent" },
    { id: "organisations", value: "85", label: "Organisations protégées", color: "text-primary" },
    { id: "response-time", value: "< 4h", label: "Temps de réponse moyen", color: "text-accent" },
  ],
  "home.workflow-steps": [
    { id: "submission", label: "Soumission", description: "Rapport envoyé par le hacker" },
    { id: "analysis", label: "Analyse MCP", description: "Classification automatique" },
    { id: "evaluation", label: "Évaluation", description: "Scoring de sévérité" },
    { id: "decision", label: "Décision", description: "Accepter / Rejeter / Compléter" },
    { id: "notification", label: "Notification", description: "Organisation alertée" },
  ],
  "mcp-agents.agents": [
    {
      id: "vulnerability-analysis", name: "Agent d'Analyse des Vulnérabilités", model: "DeepSeek",
      description: "Classe chaque rapport dans la taxonomie VRT de la plateforme et identifie le CWE correspondant.",
      capabilities: ["Classification dans le catalogue VRT existant", "Identification du CWE", "Analyse fondée strictement sur le rapport soumis", "Propose une nouvelle catégorie si aucune ne correspond"],
    },
    {
      id: "severity-assessment", name: "Agent d'Évaluation de la Sévérité", model: "DeepSeek",
      description: "Score CVSS v3.1 (vecteur et note) et sévérité suggérée, à partir de la classification établie.",
      capabilities: ["Scoring CVSS v3.1", "Vérifie la cohérence avec un CVSS déjà fourni par le hacker", "Prise en compte de la catégorie de vulnérabilité identifiée"],
    },
    {
      id: "false-positive-detection", name: "Agent de Détection de Faux Positifs", model: "Qwen",
      description: "Évalue la plausibilité et la reproductibilité du rapport à partir des preuves fournies.",
      capabilities: ["Analyse de cohérence des preuves", "Évaluation de la reproductibilité décrite", "Tient compte du contrôle de doublon exact déjà effectué par la plateforme"],
    },
    {
      id: "anti-fraud", name: "Agent Anti-Fraude", model: "Qwen",
      description: "Détection sémantique — paraphrase, incohérences internes, signes de copie d'un write-up public. Complète le contrôle de similarité textuelle déjà en place.",
      capabilities: ["Détection de paraphrase (au-delà du copier-coller exact)", "Recherche d'incohérences internes au rapport", "Génère un signal de fraude réservé à la revue humaine — aucun blocage automatique"],
    },
    {
      id: "recommendation", name: "Agent de Recommandation", model: "Kimi",
      description: "Complète la remédiation seulement si celle du hacker est absente ou insuffisante — ne la remplace jamais.",
      capabilities: ["Respecte la remédiation déjà proposée par le hacker si elle est suffisante", "Suggestions ancrées dans la catégorie de vulnérabilité identifiée", "N'invente rien qui ne découle pas du rapport"],
    },
    {
      id: "decision", name: "Agent de Décision", model: "ChatGPT",
      description: "Synthétise les analyses des agents précédents en une décision suggérée — jamais appliquée automatiquement.",
      capabilities: ["Synthèse de toutes les analyses en amont", "Suggestion : accepter / rejeter / demander des informations", "Toujours soumise à la validation de la triage humaine"],
    },
    {
      id: "reward", name: "Agent de Gestion des Récompenses", model: "ChatGPT",
      description: "Montant suggéré, ancré dans les tiers de récompense réels du programme concerné — jamais versé automatiquement.",
      capabilities: ["Respecte les tiers min/max définis par le programme", "Cohérent avec la sévérité retenue", "Suggestion pré-remplie, validée manuellement par la finance"],
    },
  ],
  "mcp-agents.workflow": [
    { step: "1", label: "Soumission", desc: "Le hacker soumet son rapport" },
    { step: "2", label: "Analyse", desc: "Classification automatique" },
    { step: "3", label: "Évaluation", desc: "Scoring de sévérité" },
    { step: "4", label: "Vérification", desc: "Faux positifs & anti-fraude" },
    { step: "5", label: "Recommandation", desc: "Enrichissement si nécessaire" },
    { step: "6", label: "Décision", desc: "Suggestion soumise à la triage" },
  ],
  "soumettre-rapport.severity-levels": [
    { value: "critique", label: "Critique", description: "Contrôle total, RCE, accès DB total" },
    { value: "haute", label: "Haute", description: "Accès données sensibles, IDOR critique" },
    { value: "moyenne", label: "Moyenne", description: "Impact partiel, contournement mineur" },
    { value: "faible", label: "Faible", description: "Impact limité, exposition faible" },
    { value: "info", label: "Info", description: "Best practices, info non sensible" },
  ],
  "programmes.filters": ["Tous", "Web", "API", "Mobile", "Infrastructure", "Private", "VDP"],
  "hacker.programmes.filters": ["Tous", "Web", "API", "Mobile", "Infrastructure", "Public", "Privé", "VDP"],
};

// Flat text entries, same "seeded so the admin editor starts pre-populated" rationale
// as DEFAULT_JSON_ENTRIES above.
const DEFAULT_TEXT_ENTRIES: Record<string, string> = {
  "contact.email": "contact@bugbounty.com",
  "contact.phone": "+241 00 00 00 00",
  "contact.intro": "Une question sur la plateforme ? Envoyez-nous un message.",
  "home.hero.title-line1": "Bug Bounty",
  "home.hero.title-line2": "Gabon",
  "home.hero.subtitle": "Système collaboratif de cybersécurité propulsé par des agents MCP intelligents. Protégez vos infrastructures numériques avec les meilleurs hackers éthiques.",
  "connexion.title": "Accès Sécurisé",
  "connexion.subtitle": "Gérez vos vulnérabilités et vos programmes avec l'IA.",
  "inscription.title": "Rejoignez le Réseau",
  "inscription.subtitle": "Contribuez à la sécurité numérique du Gabon.",
  "mot-de-passe-oublie.title": "Mot de passe oublié",
  "mot-de-passe-oublie.subtitle": "Recevez un lien sécurisé de réinitialisation",
  "reinitialiser-mot-de-passe.title": "Réinitialiser le mot de passe",
  "reinitialiser-mot-de-passe.subtitle": "Définissez un nouveau mot de passe sécurisé",
  "soumettre-programme.subtitle": "Ouvrez votre scope aux hackers éthiques. Le programme sera visible après validation.",
  "not-found.message": "Oops! Page not found",
  "not-found.link-label": "Return to Home",

  // Phase 3 (internal dashboard) batch 1: page headers only (title/subtitle) for the
  // admin/hacker/entreprise index pages. Icons, live status badges, and any subtitle
  // with an interpolated dynamic value (user name, platform name) stay hardcoded —
  // same "id-keyed local mapping" rule as Phase 2, applied to headers instead of lists.
  "admin.support.title": "Support Desk",
  "admin.support.subtitle": "Centre d'opérations : Tickets, Utilisateurs et Modération.",
  "admin.roles.title": "Rôles & Permissions",
  "admin.roles.subtitle": "Créez un rôle et attribuez-lui des permissions existantes — aucune modification de code nécessaire.",
  "admin.utilisateurs.title": "Gestion des Utilisateurs",
  "admin.utilisateurs.subtitle": "Administration, KYC et contrôle d'accès global.",
  "admin.fraud.title": "Détection de fraude",
  "admin.fraud.subtitle": "Signaux heuristiques à revue humaine — rien n'est bloqué automatiquement.",
  "admin.logs.title": "Cyber-SIEM™",
  "admin.logs.subtitle": "Système de Gestion des Informations et des Événements de Sécurité.",
  "admin.triage.title": "Triage Control Center",
  "admin.triage.subtitle": "Validation technique et analyse de sévérité des vulnérabilités.",
  "admin.finance.title": "Finance Hub",
  "admin.finance.subtitle": "Gestion des flux financiers, budgets et versements de primes.",
  "admin.knowledge-base.title": "Base de Connaissances",
  "admin.knowledge-base.subtitle": "Protocoles officiels et guides de résolution pour le Support.",
  "admin.dashboard.title": "Contrôle Maître",
  "admin.rapports.title": "Gestion des rapports",
  "admin.programmes.title": "Gestion des programmes",
  "hacker.dashboard.title": "Centre d'Élite",
  "hacker.parametres.title": "Paramètres du Compte",
  "hacker.rapports.title": "Mes Rapports de Sécurité",
  "hacker.rapports.subtitle": "Suivi en temps réel de vos soumissions et de l'analyse IA.",
  "hacker.programmes.title": "Exploration des Cibles",
  "hacker.programmes.subtitle": "Découvrez de nouveaux programmes et commencez vos recherches.",
  "entreprise.dashboard.title": "Corporate Shield",
  "entreprise.rapports.title": "Rapports reçus",
  "entreprise.programmes.title": "Mes programmes",
  "entreprise.parametres.title": "Paramètres",

  // Phase 3 batch 2: closes the header gap left by batch 1 (AdminParametres,
  // AdminTaxonomy weren't in that pass), plus empty-state messages — the highest
  // value, lowest-risk slice of what's below the headers (tables/dialogs/help
  // text are a much larger, not-yet-scoped remainder of Phase 3).
  "admin.parametres.title": "Configuration Système",
  "admin.parametres.subtitle": "Gérez les politiques globales et les intégrations de la plateforme.",
  "admin.parametres.tabs.general": "Général",
  "admin.parametres.tabs.security": "Sécurité",
  "admin.parametres.tabs.integrations": "Intégrations",
  "admin.parametres.tabs.team": "Équipe",
  "admin.taxonomy.title": "Taxonomie des vulnérabilités",
  "admin.taxonomy.subtitle": "Catalogue de base + catégories proposées par les hackers — complétez-les avec un CWE et une sévérité.",
  "admin.taxonomy.create-dialog.title": "Créer une catégorie",
  "admin.taxonomy.create-dialog.description": "Contrôle total, sans fusion automatique — contrairement à la proposition depuis le formulaire hacker.",
  "admin.taxonomy.edit-dialog.description-system": "Catégorie du catalogue de base.",
  "admin.taxonomy.edit-dialog.description-proposed": "Catégorie proposée par un hacker ou créée manuellement — complétez le CWE, la sévérité et la hiérarchie.",
  "admin.rapports.empty-state": "Aucun rapport trouvé pour votre recherche.",
  "admin.fraud.empty-state.title": "Aucun signal",
  "admin.fraud.empty-state.help": "Lancez une analyse pour examiner les comptes, rapports et versements récents.",
  "admin.triage-widget.title": "File de Triage Global (Priorité IA)",
  "admin.triage-widget.empty-state": "Aucun rapport en attente de triage.",
  "hacker.programmes.empty-state": "Aucun programme trouvé",
  "hacker.rapports.empty-state": "Aucun rapport trouvé",
  "entreprise.programmes.empty-state": "Aucun programme créé",
  "entreprise.rapports.empty-state": "Aucun rapport reçu",

  // Phase 3 batch 3: admin dashboard dialogs (config/maintenance), the four
  // admin/parametres tabs (General/Security/Integrations/Team), and AdminRoles's
  // dialog copy — the cohesive "admin settings & dialogs" slice of the
  // Explore-agent survey.
  "admin.dashboard.config-dialog.title": "Configuration Système",
  "admin.dashboard.config-dialog.description": "Pilotez les paramètres globaux de la plateforme",
  "admin.dashboard.maintenance-toggle.help": "Bloque l'accès à la plateforme pour tous, sauf les administrateurs.",
  "admin.dashboard.notifications-toggle.help": "Diffuser les alertes critiques à toute la plateforme.",
  "admin.dashboard.maintenance-dialog.title": "Activer la maintenance",
  "admin.dashboard.maintenance-dialog.description": "La plateforme sera inaccessible pour tous les utilisateurs (sauf les administrateurs) pendant la durée indiquée. Maximum 24 heures.",
  "admin.dashboard.growth-card.title": "Croissance Plateforme",
  "admin.dashboard.health-card.title": "Santé de la Plateforme",
  "admin.dashboard.availability-card.title": "Disponibilité Système",
  "admin.parametres.general.identity-heading": "Identité de la Plateforme",
  "admin.parametres.general.triage-heading": "Paramètres de Triage",
  "admin.parametres.general.auto-triage-help": "Utiliser Smart-Triage™ pour pré-valider les rapports.",
  "admin.parametres.general.enterprise-validation-help": "L'entreprise doit valider avant tout paiement.",
  "admin.parametres.security.heading": "Politiques de Sécurité Globale",
  "admin.parametres.security.2fa-help": "Pour tous les comptes administrateurs et entreprises.",
  "admin.parametres.security.ip-whitelist-help": "Restreindre l'accès à certaines adresses IP.",
  "admin.parametres.integrations.dialog-description": "Configurez vos paramètres de connexion.",
  "admin.parametres.integrations.slack-help": "Créez une application Slack et activez les \"Incoming Webhooks\" pour obtenir cette URL.",
  "admin.parametres.integrations.discord-help": "Dans les paramètres de votre salon Discord, allez dans Intégrations > Webhooks pour créer un connecteur.",
  "admin.parametres.integrations.smtp-help": "Utilisez le service SMTP de Google Workspace pour une délivrabilité maximale. Assurez-vous d'avoir configuré le SPF et DKIM sur votre domaine.",
  "admin.parametres.integrations.api-empty": "Aucune clé active. Générez-en une pour commencer.",
  "admin.parametres.integrations.api-help": "Les clés API permettent d'accéder aux rapports et statistiques via notre SDK ou API REST. Ne partagez jamais ces clés.",
  "admin.parametres.team.heading": "Administrateurs du Système",
  "admin.parametres.team.invite-dialog.title": "Nouveau Membre",
  "admin.parametres.team.invite-dialog.description": "Invitez un nouvel administrateur à rejoindre l'équipe de gestion.",
  "admin.parametres.team.invite-2fa-help": "Le nouveau membre recevra une invitation par email pour configurer son mot de passe et son authentification 2FA.",
  "admin.roles.create-dialog.title": "Créer un rôle",
  "admin.roles.create-dialog.description": "Un nouveau rôle peut recevoir n'importe quelle combinaison des permissions existantes — aucun déploiement requis.",
  "admin.roles.edit-dialog.description": "Les comptes ayant ce rôle voient l'effet immédiatement, sans redémarrage.",

  // Phase 3 batch 4: remaining admin pages surveyed but not yet migrated —
  // AdminKnowledgeBase, AdminUserDetail, AdminTicketDetail, SupportDashboard,
  // TriageDashboard, FinanceDashboard, AdminLogs, AdminUtilisateurs.
  "admin.knowledge-base.trending-heading": "Articles Tendances",
  "admin.knowledge-base.quick-help.title": "Aide Rapide",
  "admin.knowledge-base.quick-help.text": "Vous ne trouvez pas la réponse à un cas spécifique ? Contactez l'administrateur principal ou utilisez le canal de triage Slack.",
  "admin.knowledge-base.links-heading": "Liens Externes",
  "admin.user-detail.not-found": "Utilisateur Introuvable",
  "admin.user-detail.tabs.activity": "Activité",
  "admin.user-detail.tabs.kyc": "Documents KYC",
  "admin.user-detail.tabs.security": "Sécurité & Logs",
  "admin.user-detail.recent-reports-heading": "Rapports Récents",
  "admin.user-detail.audit-logs-heading": "Logs d'audit spécifique",
  "admin.ticket-detail.case-details-heading": "Détails du Cas",
  "admin.ticket-detail.user-context-heading": "Contexte Utilisateur",
  "admin.ticket-detail.kb-heading": "Base de Connaissances",
  "admin.support.tabs.tickets": "File de Tickets",
  "admin.support.tabs.users": "Utilisateurs & KYC",
  "admin.support.tabs.moderation": "Modération",
  "admin.support.tickets-heading": "File Prioritaire",
  "admin.support.moderation-heading": "Vigilance",
  "admin.support.kb-card.heading": "Base de Connaissances",
  "admin.support.kb-card.text": "Accédez aux protocoles de résolution et aux guides de médiation officiels.",
  "admin.support.performance-heading": "Performance Support",
  "admin.triage.priorities-heading": "Priorités de la journée",
  "admin.triage.queue-heading": "File d'attente active",
  "admin.finance.transactions-heading": "Dernières Transactions",
  "admin.finance.top-programmes-heading": "Top Programmes (Coût)",
  "admin.finance.compliance-heading": "Compliance Status",
  "admin.logs.events-stream.title": "Flux d'Événements Consolidé",
  "admin.logs.empty-state.title": "Zero Intelligence Found",
  "admin.logs.empty-state.reset-button": "Réinitialiser l'Audit",
  "admin.utilisateurs.kyc-heading": "Validation d'Identité (KYC)",

  // Phase 3 batch 5: hacker and entreprise pages — closes the Explore-agent
  // survey's catalog (mock/demo data and individual form field labels stay
  // excluded, same rule as every earlier Phase 3 batch).
  "hacker.dashboard.performance-heading": "Performance Mensuelle",
  "hacker.dashboard.specialization-heading": "Spécialisation",
  "hacker.dashboard.recent-submissions-heading": "Soumissions Récentes",
  "hacker.dashboard.opportunities-heading": "Opportunités",
  "hacker.profil.stats-heading": "Statistiques Vitales",
  "hacker.profil.badges-heading": "Succès & Badges",
  "hacker.profil.config-heading": "Configuration du Profil",
  "hacker.profil.config-subtitle": "Gérez votre identité publique sur Gabon Bug Bounty AI.",
  "hacker.profil.name-help": "C'est le nom qui sera affiché sur les leaderboards.",
  "hacker.profil.social-heading": "Connexions Sociales",
  "hacker.parametres.profile.heading": "Informations d'inscription",
  "hacker.parametres.payment.heading": "Configuration paiement",
  "hacker.parametres.payment.gains-help": "Activez cette option pour recevoir vos paiements.",
  "hacker.parametres.payment.methods-heading": "Ajouter un ou plusieurs moyens de paiement",
  "hacker.parametres.payout.heading": "Préférences globales",
  "hacker.parametres.payout.auto-withdrawal-help": "Si activé, le paiement sera envoyé automatiquement.",
  "entreprise.dashboard.sla-heading": "Performance SLA",
  "entreprise.dashboard.severity-heading": "Répartition par Sévérité",
  "entreprise.dashboard.programmes-heading": "État des Programmes",
  "entreprise.dashboard.top-researchers-heading": "Top Chercheurs",
  "entreprise.dashboard.health-score-heading": "Score de Santé Sécurité",
  "entreprise.parametres.org-heading": "Informations de l'organisation",
  "entreprise.programmes.tiers-help": "Tiers de récompense par sévérité (optionnel)",
};

export async function seedContentDefaults(prisma: PrismaClient) {
  const existingNavbarCount = await prisma.navbarItem.count();
  if (existingNavbarCount === 0) {
    for (const [index, item] of DEFAULT_NAVBAR_ITEMS.entries()) {
      await prisma.navbarItem.create({ data: { ...item, order: index } });
    }
  }

  const existingColumnCount = await prisma.footerColumn.count();
  if (existingColumnCount === 0) {
    const column = await prisma.footerColumn.create({ data: { title: "Liens", order: 0 } });
    for (const [index, link] of DEFAULT_FOOTER_LINKS.entries()) {
      await prisma.footerLink.create({ data: { ...link, columnId: column.id, order: index } });
    }
  }

  // Per-key existence check (not a single count()===0 gate like above): new pages
  // get their keys added here across multiple future phases, so a key seeded in an
  // earlier phase must not block a key added in a later one from ever being created.
  for (const [key, value] of Object.entries(DEFAULT_JSON_ENTRIES)) {
    const exists = await prisma.contentEntry.findUnique({ where: { key } });
    if (!exists) {
      await prisma.contentEntry.create({ data: { key, type: "json", value: JSON.stringify(value) } });
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_TEXT_ENTRIES)) {
    const exists = await prisma.contentEntry.findUnique({ where: { key } });
    if (!exists) {
      await prisma.contentEntry.create({ data: { key, type: "text", value } });
    }
  }
}
