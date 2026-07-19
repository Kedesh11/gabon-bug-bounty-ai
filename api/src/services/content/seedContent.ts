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
}
