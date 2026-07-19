import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { AnalysisStatus, ReportStatus, Severity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listReportsForUser,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  attachReportPdf,
  toReportPdfData,
} from "../services/reports/reportsService.js";
import { renderReportPdf } from "../services/reports/reportPdf.js";
import { runMcpPipeline } from "../services/mcpAgents/orchestrator.js";

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  },
});

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

reportsRouter.post(
  "/:id/pdf",
  requirePermission("reports.create"),
  pdfUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Fichier PDF manquant ou invalide (10MB max, application/pdf uniquement)");
    const report = await attachReportPdf(req.params.id, req.user!.id, req.file);
    res.json({ report });
  }),
);

// Re-runs the 7-agent MCP pipeline (suggestion-only — see services/mcpAgents) on an
// already-submitted report, e.g. after a failed run or a report edit. Reuses
// reports.triage: the same permission that gates manual triage already implies
// "can act on this report's analysis". Fire-and-forget like the automatic trigger
// in createReport() — 7 LLM calls can take 10-30s, never worth holding the request.
reportsRouter.post(
  "/:id/mcp-analysis",
  requirePermission("reports.triage"),
  asyncHandler(async (req, res) => {
    await getReportById(req.params.id, req.user!);
    runMcpPipeline(req.params.id).catch((err) => console.error(`[mcpAgents] manual trigger failed for report ${req.params.id}:`, err));
    res.status(202).json({ started: true });
  }),
);

// Platform-generated structured PDF export (Phase 4), distinct from the hacker's own
// uploaded write-up above: rendered on the fly from the report's structured fields,
// not stored. Access follows the same visibility rule as GET /:id (getReportById).
reportsRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const report = await getReportById(req.params.id, req.user!);
    const buffer = await renderReportPdf(toReportPdfData(report));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="rapport-${report.id}.pdf"`);
    res.send(buffer);
  }),
);
