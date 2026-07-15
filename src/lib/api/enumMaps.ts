import { Programme, Report } from "@/types/domain";

// The only two enums where the Prisma schema (ASCII, matches Postgres enum identifiers)
// diverges from the frontend view-model (French, accented). Everything else (Severity,
// ProgrammeType, PaymentMethod, ...) is spelled identically on both sides.

export const REPORT_STATUS_FROM_API: Record<string, Report["status"]> = {
  soumis: "soumis",
  en_analyse: "en_analyse",
  accepte: "accepté",
  rejete: "rejeté",
  resolu: "résolu",
};

export const REPORT_STATUS_TO_API: Record<Report["status"], string> = {
  soumis: "soumis",
  en_analyse: "en_analyse",
  accepté: "accepte",
  rejeté: "rejete",
  résolu: "resolu",
};

export const PROGRAMME_STATUS_FROM_API: Record<string, Programme["status"]> = {
  actif: "actif",
  pause: "pause",
  ferme: "fermé",
};

export const PROGRAMME_STATUS_TO_API: Record<Programme["status"], string> = {
  actif: "actif",
  pause: "pause",
  fermé: "ferme",
};
