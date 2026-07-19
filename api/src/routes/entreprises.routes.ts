import { Router } from "express";
import { z } from "zod";
import { EntrepriseStatus } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listEntreprises,
  getEntrepriseById,
  updateEntreprise,
  deleteEntreprise,
} from "../services/entreprises/entreprisesService.js";

export const entreprisesRouter = Router();
entreprisesRouter.use(requireAuth);

entreprisesRouter.get(
  "/",
  requirePermission("entreprises.manage"),
  asyncHandler(async (_req, res) => {
    const entreprises = await listEntreprises();
    res.json({ entreprises });
  }),
);

entreprisesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const entreprise = await getEntrepriseById(req.params.id, req.user!);
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
    const body = updateEntrepriseSchema.parse(req.body);
    const entreprise = await updateEntreprise(req.params.id, req.user!, body);
    res.json({ entreprise });
  }),
);

entreprisesRouter.delete(
  "/:id",
  requirePermission("entreprises.manage"),
  asyncHandler(async (req, res) => {
    await deleteEntreprise(req.params.id);
    res.status(204).send();
  }),
);
