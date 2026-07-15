// Static decorative content for the CrowdStream widget and the admin SIEM-style logs page.
// There is no backend endpoint for a platform-wide activity feed or security log stream
// (api/prisma/schema.prisma has Activity/PlatformLog models, but nothing populates or
// exposes them outside a single programme's own activity) — explicitly out of scope for
// this pass, not an oversight. Kept as static illustrative content rather than pretending
// it's live.
import { ProgrammeActivity, PlatformLog } from "@/types/domain";

export const MOCK_ACTIVITIES: ProgrammeActivity[] = [
  { id: "act-1", title: "Nouveau Rapport Soumis", subtitle: "XSS trouvé sur API Gouvernementale", type: "submission", createdAt: "2024-07-18T10:00:00Z", hackerName: "CyberPanther", programmeName: "API Gouvernementale v2" },
  { id: "act-2", title: "Récompense Payée", subtitle: "500 000 XAF versés", type: "reward", createdAt: "2024-07-17T15:30:00Z", amount: 500000, hackerName: "CyberPanther", programmeName: "API Gouvernementale v2" },
  { id: "act-3", title: "Nouveau Partenaire Stratégique", subtitle: "La SEEG a lancé son audit de sécurité", type: "update", createdAt: "2024-07-20T09:00:00Z", programmeName: "Audit de Sécurité - SEEG" },
];

export const MOCK_LOGS: PlatformLog[] = [
  { id: "log-1", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: "security", level: "critical", message: "Tentative de Brute Force détectée sur l'admin", source: "AuthService", metadata: { ip: "192.168.1.45", attempts: 15 } },
  { id: "log-2", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), type: "performance", level: "warning", message: "Temps de réponse élevé sur /api/reports", source: "API Gateway", metadata: { duration: "1.2s", threshold: "0.5s" } },
  { id: "log-3", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: "user_action", level: "info", message: "Hacker_X a mis à jour ses coordonnées bancaires", source: "AccountService", userId: "hacker-1" },
  { id: "log-4", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: "system", level: "info", message: "Mise à jour automatique du certificat SSL terminée", source: "Infrastructure" },
  { id: "log-5", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: "security", level: "warning", message: "Accès depuis une nouvelle IP pour SEEG Gabon", source: "AuthService", metadata: { ip: "41.204.1.2", location: "Libreville, GA" } },
];
