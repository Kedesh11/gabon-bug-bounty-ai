import { Router } from "express";
import { z } from "zod";
import { AnalysisStatus, ReportStatus, Severity } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const createReportSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(1),
  severity: z.nativeEnum(Severity),
  programmeId: z.string().uuid(),
  vulnerability: z.string().min(1),
  vrtCategory: z.string().optional(),
  vrtType: z.string().optional(),
  proof: z.string().min(1),
  pdfFileName: z.string().optional(),
});

const updateReportSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  severity: z.nativeEnum(Severity).optional(),
  reward: z.number().int().nonnegative().optional(),
  analysisStatus: z.nativeEnum(AnalysisStatus).optional(),
});

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

const reportInclude = { hacker: { include: { profile: true } }, programme: true, aiAnalysis: true };

// "reports.view.all" is what used to be a hardcoded role === admin/triage/finance/support
// check — any role (built-in or custom) holding it sees every report, not just its own.
async function canView(
  userId: string,
  role: string,
  permissions: string[],
  report: { hackerId: string; entrepriseId: string },
) {
  if (permissions.includes("reports.view.all")) return true;
  if (role === "hacker") {
    const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: userId } });
    return hacker?.id === report.hackerId;
  }
  if (role === "entreprise") {
    const entreprise = await prisma.entrepriseProfile.findUnique({ where: { profileId: userId } });
    return entreprise?.id === report.entrepriseId;
  }
  return false;
}

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { role, permissions, id: userId } = req.user!;

    if (role === "hacker") {
      const reports = await prisma.report.findMany({
        where: { hacker: { profileId: userId } },
        include: reportInclude,
        orderBy: { createdAt: "desc" },
      });
      res.json({ reports });
      return;
    }
    if (role === "entreprise") {
      const reports = await prisma.report.findMany({
        where: { programme: { entreprise: { profileId: userId } } },
        include: reportInclude,
        orderBy: { createdAt: "desc" },
      });
      res.json({ reports });
      return;
    }
    if (!permissions.includes("reports.view.all")) {
      res.json({ reports: [] });
      return;
    }

    const reports = await prisma.report.findMany({
      include: reportInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  }),
);

reportsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: reportInclude,
    });
    if (!report) throw new HttpError(404, "Rapport introuvable");
    if (!(await canView(req.user!.id, req.user!.role, req.user!.permissions, report))) {
      throw new HttpError(403, "Accès refusé à ce rapport");
    }
    res.json({ report });
  }),
);

reportsRouter.post(
  "/",
  requirePermission("reports.create"),
  asyncHandler(async (req, res) => {
    const body = createReportSchema.parse(req.body);

    const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: req.user!.id } });
    if (!hacker) throw new HttpError(403, "Aucun profil hacker associé à ce compte");

    const programme = await prisma.programme.findUnique({ where: { id: body.programmeId } });
    if (!programme) throw new HttpError(404, "Programme introuvable");

    const report = await prisma.report.create({
      data: {
        ...body,
        hackerId: hacker.id,
        entrepriseId: programme.entrepriseId,
        status: "soumis",
        reward: 0,
        analysisStatus: "en_attente",
        aiAnalysis: { create: buildPlaceholderAnalysis(body.title, body.vulnerability, body.severity) },
      },
      include: reportInclude,
    });

    await prisma.programme.update({
      where: { id: programme.id },
      data: { reportsCount: { increment: 1 } },
    });

    res.status(201).json({ report });
  }),
);

reportsRouter.patch(
  "/:id",
  requirePermission("reports.triage"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Rapport introuvable");

    const body = updateReportSchema.parse(req.body);
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: body,
      include: reportInclude,
    });

    res.json({ report });
  }),
);

reportsRouter.delete(
  "/:id",
  requirePermission("reports.delete"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Rapport introuvable");
    await prisma.report.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
