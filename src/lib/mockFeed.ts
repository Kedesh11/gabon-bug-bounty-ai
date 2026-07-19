// Static decorative content for the admin SIEM-style logs page. There is no backend
// endpoint for a security log stream (api/prisma/schema.prisma has a PlatformLog model,
// but nothing populates or exposes it) — explicitly out of scope for this pass, not an
// oversight. Kept as static illustrative content rather than pretending it's live.
// (CrowdStream used to live here too — it's now derived from real data, see
// src/lib/activityFeed.ts.)
import { PlatformLog } from "@/types/domain";

export const MOCK_LOGS: PlatformLog[] = [
  { id: "log-1", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: "security", level: "critical", message: "Tentative de Brute Force détectée sur l'admin", source: "AuthService", metadata: { ip: "192.168.1.45", attempts: 15 } },
  { id: "log-2", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), type: "performance", level: "warning", message: "Temps de réponse élevé sur /api/reports", source: "API Gateway", metadata: { duration: "1.2s", threshold: "0.5s" } },
  { id: "log-3", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: "user_action", level: "info", message: "Hacker_X a mis à jour ses coordonnées bancaires", source: "AccountService", userId: "hacker-1" },
  { id: "log-4", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: "system", level: "info", message: "Mise à jour automatique du certificat SSL terminée", source: "Infrastructure" },
  { id: "log-5", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: "security", level: "warning", message: "Accès depuis une nouvelle IP pour SEEG Gabon", source: "AuthService", metadata: { ip: "41.204.1.2", location: "Libreville, GA" } },
];
