import type { AnalysisStatus, ReportStatus, Severity } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { AuthenticatedUser } from "../../middleware/auth.js";

export const reportInclude = { hacker: { include: { profile: true } }, programme: true, aiAnalysis: true };

// Not real AI: a deterministic placeholder mirroring the frontend mock in
// src/stores/dataStore.ts until a genuine triage model is wired up.
function buildPlaceholderAnalysis(title: string, vulnerability: string, severity: Severity) {
  return {
    confidence: 0.7 + Math.random() * 0.25,
    suggestedSeverity: severity,
    isDuplicate: false,
    summary: `Analyse automatique de "${title}". Le PoC semble valide. Vulnérabilité de type ${vulnerability} confirmée par analyse syntaxique.`,
    reproductionLikelihood: 0.8,
  };
}

// "reports.view.all" is what used to be a hardcoded role === admin/triage/finance/support
// check — any role (built-in or custom) holding it sees every report, not just its own.
async function canView(user: AuthenticatedUser, report: { hackerId: string; entrepriseId: string }) {
  if (user.permissions.includes("reports.view.all")) return true;
  if (user.role === "hacker") {
    const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: user.id } });
    return hacker?.id === report.hackerId;
  }
  if (user.role === "entreprise") {
    const entreprise = await prisma.entrepriseProfile.findUnique({ where: { profileId: user.id } });
    return entreprise?.id === report.entrepriseId;
  }
  return false;
}

export async function listReportsForUser(user: AuthenticatedUser) {
  if (user.role === "hacker") {
    return prisma.report.findMany({
      where: { hacker: { profileId: user.id } },
      include: reportInclude,
      orderBy: { createdAt: "desc" },
    });
  }
  if (user.role === "entreprise") {
    return prisma.report.findMany({
      where: { programme: { entreprise: { profileId: user.id } } },
      include: reportInclude,
      orderBy: { createdAt: "desc" },
    });
  }
  if (!user.permissions.includes("reports.view.all")) return [];

  return prisma.report.findMany({ include: reportInclude, orderBy: { createdAt: "desc" } });
}

export async function getReportById(id: string, user: AuthenticatedUser) {
  const report = await prisma.report.findUnique({ where: { id }, include: reportInclude });
  if (!report) throw new HttpError(404, "Rapport introuvable");
  if (!(await canView(user, report))) throw new HttpError(403, "Accès refusé à ce rapport");
  return report;
}

export interface CreateReportInput {
  title: string;
  description: string;
  severity: Severity;
  programmeId: string;
  vulnerability: string;
  vrtCategory?: string;
  vrtType?: string;
  proof: string;
  pdfFileName?: string;
}

export async function createReport(userId: string, input: CreateReportInput) {
  const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: userId } });
  if (!hacker) throw new HttpError(403, "Aucun profil hacker associé à ce compte");

  const programme = await prisma.programme.findUnique({ where: { id: input.programmeId } });
  if (!programme) throw new HttpError(404, "Programme introuvable");

  const report = await prisma.report.create({
    data: {
      ...input,
      hackerId: hacker.id,
      entrepriseId: programme.entrepriseId,
      status: "soumis",
      reward: 0,
      analysisStatus: "en_attente",
      aiAnalysis: { create: buildPlaceholderAnalysis(input.title, input.vulnerability, input.severity) },
    },
    include: reportInclude,
  });

  await prisma.programme.update({ where: { id: programme.id }, data: { reportsCount: { increment: 1 } } });

  return report;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  severity?: Severity;
  reward?: number;
  analysisStatus?: AnalysisStatus;
}

export async function updateReport(id: string, input: UpdateReportInput) {
  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Rapport introuvable");

  return prisma.report.update({ where: { id }, data: input, include: reportInclude });
}

export async function deleteReport(id: string) {
  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Rapport introuvable");
  await prisma.report.delete({ where: { id } });
}
