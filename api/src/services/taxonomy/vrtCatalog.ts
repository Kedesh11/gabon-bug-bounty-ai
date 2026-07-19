import type { Severity } from "@prisma/client";

export interface VulnerabilityCategoryDef {
  key: string;
  name: string;
  cweId?: string;
  defaultSeverity?: Severity;
  description?: string;
  parentKey?: string;
}

// A working subset of a HackerOne-style Vulnerability Rating Taxonomy (VRT):
// top-level attack classes with a few concrete, CWE-mapped leaf categories each.
// Not exhaustive — extendable by adding entries here and re-seeding, not by
// editing report data (categories are code-defined, not admin-editable).
export const VULNERABILITY_CATEGORIES: VulnerabilityCategoryDef[] = [
  { key: "injection", name: "Injection", description: "Données non fiables interprétées comme du code ou des commandes par un interpréteur." },
  { key: "injection.sql", name: "Injection SQL", cweId: "CWE-89", defaultSeverity: "critique", parentKey: "injection" },
  { key: "injection.command", name: "Injection de commande OS", cweId: "CWE-78", defaultSeverity: "critique", parentKey: "injection" },
  { key: "injection.nosql", name: "Injection NoSQL", cweId: "CWE-943", defaultSeverity: "haute", parentKey: "injection" },
  { key: "injection.xxe", name: "XML External Entity (XXE)", cweId: "CWE-611", defaultSeverity: "haute", parentKey: "injection" },

  { key: "xss", name: "Cross-Site Scripting (XSS)", cweId: "CWE-79", description: "Injection de script exécuté dans le navigateur d'une victime." },
  { key: "xss.reflected", name: "XSS Réfléchi", cweId: "CWE-79", defaultSeverity: "moyenne", parentKey: "xss" },
  { key: "xss.stored", name: "XSS Stocké", cweId: "CWE-79", defaultSeverity: "haute", parentKey: "xss" },
  { key: "xss.dom", name: "XSS DOM-based", cweId: "CWE-79", defaultSeverity: "moyenne", parentKey: "xss" },

  { key: "access_control", name: "Contrôle d'accès défaillant", description: "Restrictions sur ce que les utilisateurs authentifiés peuvent faire, mal appliquées." },
  { key: "access_control.idor", name: "Référence directe non sécurisée (IDOR)", cweId: "CWE-639", defaultSeverity: "haute", parentKey: "access_control" },
  { key: "access_control.privesc", name: "Élévation de privilèges", cweId: "CWE-269", defaultSeverity: "critique", parentKey: "access_control" },
  { key: "access_control.forced_browsing", name: "Forced Browsing / accès non authentifié", cweId: "CWE-425", defaultSeverity: "moyenne", parentKey: "access_control" },

  { key: "auth", name: "Authentification et gestion de session", description: "Défauts dans la vérification d'identité ou le cycle de vie des sessions." },
  { key: "auth.broken", name: "Authentification cassée", cweId: "CWE-287", defaultSeverity: "critique", parentKey: "auth" },
  { key: "auth.session_fixation", name: "Fixation de session", cweId: "CWE-384", defaultSeverity: "haute", parentKey: "auth" },
  { key: "auth.weak_password_recovery", name: "Récupération de mot de passe faible", cweId: "CWE-640", defaultSeverity: "haute", parentKey: "auth" },

  { key: "ssrf", name: "Server-Side Request Forgery (SSRF)", cweId: "CWE-918", defaultSeverity: "haute", description: "Le serveur est contraint d'émettre des requêtes vers une destination arbitraire." },

  { key: "rce", name: "Exécution de code à distance (RCE)", cweId: "CWE-94", defaultSeverity: "critique", description: "Exécution de code arbitraire côté serveur." },

  { key: "misconfiguration", name: "Mauvaise configuration de sécurité", cweId: "CWE-16", description: "Paramètres par défaut, incomplets ou mal durcis." },
  { key: "misconfiguration.exposed_admin", name: "Interface d'administration exposée", cweId: "CWE-16", defaultSeverity: "haute", parentKey: "misconfiguration" },
  { key: "misconfiguration.verbose_errors", name: "Messages d'erreur trop verbeux", cweId: "CWE-209", defaultSeverity: "faible", parentKey: "misconfiguration" },
  { key: "misconfiguration.cors", name: "CORS mal configuré", cweId: "CWE-942", defaultSeverity: "moyenne", parentKey: "misconfiguration" },

  { key: "data_exposure", name: "Exposition de données sensibles", cweId: "CWE-200", description: "Divulgation d'informations qui devraient rester confidentielles." },
  { key: "data_exposure.pii_leak", name: "Fuite de données personnelles (PII)", cweId: "CWE-200", defaultSeverity: "haute", parentKey: "data_exposure" },
  { key: "data_exposure.secrets_in_repo", name: "Secrets exposés (clés API, identifiants)", cweId: "CWE-798", defaultSeverity: "critique", parentKey: "data_exposure" },

  { key: "deserialization", name: "Désérialisation non sécurisée", cweId: "CWE-502", defaultSeverity: "haute", description: "Traitement non fiable de données sérialisées, pouvant mener à du RCE." },

  { key: "csrf", name: "Cross-Site Request Forgery (CSRF)", cweId: "CWE-352", defaultSeverity: "moyenne", description: "Une action authentifiée est déclenchée à l'insu de l'utilisateur." },

  { key: "business_logic", name: "Vulnérabilités de logique métier", cweId: "CWE-841", description: "Contournement de règles métier attendues (ex : prix, quotas, workflow)." },
  { key: "business_logic.race_condition", name: "Condition de course (Race Condition)", cweId: "CWE-362", defaultSeverity: "haute", parentKey: "business_logic" },
  { key: "business_logic.price_manipulation", name: "Manipulation de prix / quantité", cweId: "CWE-840", defaultSeverity: "haute", parentKey: "business_logic" },

  { key: "rate_limiting", name: "Absence de limitation de débit", cweId: "CWE-770", defaultSeverity: "faible", description: "Absence de protection contre les abus par volume de requêtes." },

  { key: "other", name: "Autre", description: "Catégorie de repli pour une vulnérabilité ne correspondant à aucune classe ci-dessus." },
];
