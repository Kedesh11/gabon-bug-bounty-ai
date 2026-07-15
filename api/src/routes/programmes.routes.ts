import { Router } from "express";
import { z } from "zod";
import { ProgrammeStatus, ProgrammeType, RewardCurrency, SafeHarbor, Severity, TestingPeriod } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

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

async function resolveEntrepriseId(userId: string, role: string, requestedId?: string) {
  if (role === "admin") {
    if (!requestedId) throw new HttpError(400, "entrepriseId requis pour un admin");
    return requestedId;
  }
  const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: userId } });
  if (!owned) throw new HttpError(403, "Aucun profil entreprise associé à ce compte");
  return owned.id;
}

const entrepriseInclude = { entreprise: { include: { profile: true } } };

programmesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const programmes = await prisma.programme.findMany({
      include: { rewardTiers: true, ...entrepriseInclude },
      orderBy: { createdAt: "desc" },
    });
    res.json({ programmes });
  }),
);

programmesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const programme = await prisma.programme.findUnique({
      where: { id: req.params.id },
      include: {
        rewardTiers: true,
        targetGroups: { include: { targets: true } },
        announcements: true,
        activities: true,
        ...entrepriseInclude,
      },
    });
    if (!programme) throw new HttpError(404, "Programme introuvable");
    res.json({ programme });
  }),
);

programmesRouter.post(
  "/",
  requireAuth,
  requireRole("entreprise", "admin"),
  asyncHandler(async (req, res) => {
    const body = programmeSchema.parse(req.body);
    const entrepriseId = await resolveEntrepriseId(req.user!.id, req.user!.role, body.entrepriseId);

    const { rewardTiers, entrepriseId: _ignored, ...rest } = body;
    const programme = await prisma.programme.create({
      data: {
        ...rest,
        entrepriseId,
        ...(rewardTiers ? { rewardTiers: { create: rewardTiers } } : {}),
      },
      include: { rewardTiers: true, ...entrepriseInclude },
    });

    res.status(201).json({ programme });
  }),
);

programmesRouter.patch(
  "/:id",
  requireAuth,
  requireRole("entreprise", "admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.programme.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Programme introuvable");

    if (req.user!.role === "entreprise") {
      const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: req.user!.id } });
      if (!owned || owned.id !== existing.entrepriseId) {
        throw new HttpError(403, "Ce programme n'appartient pas à votre entreprise");
      }
    }

    const body = programmeSchema.partial().parse(req.body);
    const { rewardTiers, entrepriseId: _ignored, ...rest } = body;

    const programme = await prisma.programme.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(rewardTiers
          ? { rewardTiers: { deleteMany: {}, create: rewardTiers } }
          : {}),
      },
      include: { rewardTiers: true, ...entrepriseInclude },
    });

    res.json({ programme });
  }),
);

programmesRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.programme.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Programme introuvable");
    await prisma.programme.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
