import { Router } from "express";
import { z } from "zod";
import { AnalysisStatus, ReportStatus, Severity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listReportsForUser,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from "../services/reports/reportsService.js";

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
  vulnerabilityCategoryId: z.string().uuid().optional(),
  affectedAsset: z.string().min(1).optional(),
  stepsToReproduce: z.string().min(1).optional(),
  impact: z.string().optional(),
  remediation: z.string().optional(),
  cvssVector: z.string().optional(),
  cvssScore: z.number().min(0).max(10).optional(),
});

const updateReportSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  severity: z.nativeEnum(Severity).optional(),
  reward: z.number().int().nonnegative().optional(),
  analysisStatus: z.nativeEnum(AnalysisStatus).optional(),
});

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const reports = await listReportsForUser(req.user!);
    res.json({ reports });
  }),
);

reportsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await getReportById(req.params.id, req.user!);
    res.json({ report });
  }),
);

reportsRouter.post(
  "/",
  requirePermission("reports.create"),
  asyncHandler(async (req, res) => {
    const body = createReportSchema.parse(req.body);
    const report = await createReport(req.user!.id, body);
    res.status(201).json({ report });
  }),
);

reportsRouter.patch(
  "/:id",
  requirePermission("reports.triage"),
  asyncHandler(async (req, res) => {
    const body = updateReportSchema.parse(req.body);
    const report = await updateReport(req.params.id, body);
    res.json({ report });
  }),
);

reportsRouter.delete(
  "/:id",
  requirePermission("reports.delete"),
  asyncHandler(async (req, res) => {
    await deleteReport(req.params.id);
    res.status(204).send();
  }),
);
