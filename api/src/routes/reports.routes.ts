import { Router } from "express";
import { z } from "zod";
import { AnalysisStatus, ReportStatus, Severity } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

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

async function canView(userId: string, role: string, report: { hackerId: string; entrepriseId: string }) {
  if (role === "admin" || role === "triage" || role === "finance" || role === "support") return true;
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
    const { role, id: userId } = req.user!;
    const where =
      role === "hacker"
        ? { hacker: { profileId: userId } }
        : role === "entreprise"
          ? { programme: { entreprise: { profileId: userId } } }
          : {};

    const reports = await prisma.report.findMany({
      where,
      include: { aiAnalysis: true },
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
      include: { aiAnalysis: true },
    });
    if (!report) throw new HttpError(404, "Rapport introuvable");
    if (!(await canView(req.user!.id, req.user!.role, report))) {
      throw new HttpError(403, "Accès refusé à ce rapport");
    }
    res.json({ report });
  }),
);

reportsRouter.post(
  "/",
  requireRole("hacker"),
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
      include: { aiAnalysis: true },
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
  requireRole("admin", "triage", "finance"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Rapport introuvable");

    const body = updateReportSchema.parse(req.body);
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: body,
      include: { aiAnalysis: true },
    });

    res.json({ report });
  }),
);

reportsRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Rapport introuvable");
    await prisma.report.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
