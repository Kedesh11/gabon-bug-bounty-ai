import { Router } from "express";
import { z } from "zod";
import { ProgrammeStatus, ProgrammeType, ProgrammeValidationStatus, RewardCurrency, SafeHarbor, Severity, TestingPeriod } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listProgrammes,
  listMyProgrammes,
  listProgrammesForReview,
  getProgrammeById,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  validateProgramme,
} from "../services/programmes/programmesService.js";

export const programmesRouter = Router();
// Listing/detail are public (a bug bounty catalogue browsable before signup, like the
// frontend's public /programmes pages) — only mutating routes require auth below.

const rewardTierSchema = z.object({
  severity: z.nativeEnum(Severity),
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  note: z.string().optional(),
});

const programmeSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  descriptionLong: z.string().optional(),
  scope: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  methodology: z.string().optional(),
  tags: z.array(z.string()).default([]),
  sector: z.string().optional(),
  website: z.string().optional(),
  safeHarbor: z.nativeEnum(SafeHarbor).optional(),
  testingPeriod: z.nativeEnum(TestingPeriod).optional(),
  programType: z.nativeEnum(ProgrammeType).default("public"),
  minReward: z.number().int().nonnegative(),
  maxReward: z.number().int().nonnegative(),
  rewardCurrency: z.nativeEnum(RewardCurrency).default("XAF"),
  triageTimeHours: z.number().int().nonnegative().optional(),
  firstResponseHours: z.number().int().nonnegative().optional(),
  resolutionDays: z.number().int().nonnegative().optional(),
  status: z.nativeEnum(ProgrammeStatus).default("actif"),
  rewardTiers: z.array(rewardTierSchema).optional(),
  // entrepriseId is only honoured for admins creating on behalf of an entreprise;
  // for the "entreprise" role it's always derived server-side from the caller.
  entrepriseId: z.string().uuid().optional(),
});

programmesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const programmes = await listProgrammes();
    res.json({ programmes });
  }),
);

// An entreprise's own programmes, every validation status included (the public list
// above only ever returns "valide" ones) — must be declared before "/:id" below.
programmesRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const programmes = await listMyProgrammes(req.user!.id);
    res.json({ programmes });
  }),
);

const reviewQuerySchema = z.object({ validationStatus: z.nativeEnum(ProgrammeValidationStatus).optional() });

programmesRouter.get(
  "/review",
  requireAuth,
  requirePermission("programmes.validate"),
  asyncHandler(async (req, res) => {
    const query = reviewQuerySchema.parse(req.query);
    const programmes = await listProgrammesForReview(query);
    res.json({ programmes });
  }),
);

programmesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const programme = await getProgrammeById(req.params.id);
    res.json({ programme });
  }),
);

programmesRouter.post(
  "/",
  requireAuth,
  requirePermission("programmes.create"),
  asyncHandler(async (req, res) => {
    const body = programmeSchema.parse(req.body);
    const programme = await createProgramme(req.user!.id, req.user!.role, body);
    res.status(201).json({ programme });
  }),
);

programmesRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("programmes.update"),
  asyncHandler(async (req, res) => {
    const body = programmeSchema.partial().parse(req.body);
    const programme = await updateProgramme(req.params.id, req.user!, body);
    res.json({ programme });
  }),
);

programmesRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("programmes.delete"),
  asyncHandler(async (req, res) => {
    await deleteProgramme(req.params.id);
    res.status(204).send();
  }),
);

const validationSchema = z.object({
  decision: z.enum(["valide", "refuse"]),
  rejectionReason: z.string().optional(),
});

programmesRouter.patch(
  "/:id/validation",
  requireAuth,
  requirePermission("programmes.validate"),
  asyncHandler(async (req, res) => {
    const body = validationSchema.parse(req.body);
    const programme = await validateProgramme(req.params.id, req.user!.id, body);
    res.json({ programme });
  }),
);
