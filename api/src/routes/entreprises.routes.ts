import { Router } from "express";
import { z } from "zod";
import { EntrepriseStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const entreprisesRouter = Router();
entreprisesRouter.use(requireAuth);

entreprisesRouter.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const entreprises = await prisma.entrepriseProfile.findMany({ include: { profile: true } });
    res.json({ entreprises });
  }),
);

entreprisesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const entreprise = await prisma.entrepriseProfile.findUnique({
      where: { id: req.params.id },
      include: { profile: true },
    });
    if (!entreprise) throw new HttpError(404, "Entreprise introuvable");

    if (req.user!.role === "entreprise" && entreprise.profileId !== req.user!.id) {
      throw new HttpError(403, "Accès refusé");
    }

    res.json({ entreprise });
  }),
);

const updateEntrepriseSchema = z.object({
  sector: z.string().min(1).optional(),
  status: z.nativeEnum(EntrepriseStatus).optional(),
});

entreprisesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.entrepriseProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Entreprise introuvable");

    const isOwner = req.user!.role === "entreprise" && existing.profileId === req.user!.id;
    if (!isOwner && req.user!.role !== "admin") {
      throw new HttpError(403, "Accès refusé");
    }

    const body = updateEntrepriseSchema.parse(req.body);
    const entreprise = await prisma.entrepriseProfile.update({
      where: { id: req.params.id },
      data: body,
      include: { profile: true },
    });
    res.json({ entreprise });
  }),
);

entreprisesRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.entrepriseProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Entreprise introuvable");
    await prisma.entrepriseProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
