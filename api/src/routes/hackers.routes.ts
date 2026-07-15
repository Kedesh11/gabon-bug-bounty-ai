import { Router } from "express";
import { z } from "zod";
import { HackerStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const hackersRouter = Router();
hackersRouter.use(requireAuth);

hackersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const hackers = await prisma.hackerProfile.findMany({
      include: { profile: true, badges: true },
      orderBy: { reputation: "desc" },
    });
    res.json({ hackers });
  }),
);

hackersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const hacker = await prisma.hackerProfile.findUnique({
      where: { id: req.params.id },
      include: { profile: true, badges: true },
    });
    if (!hacker) throw new HttpError(404, "Hacker introuvable");
    res.json({ hacker });
  }),
);

const updateHackerSchema = z.object({
  reputation: z.number().int().optional(),
  bugsFound: z.number().int().optional(),
  totalRewards: z.number().int().optional(),
  rank: z.number().int().optional(),
  specialties: z.array(z.string()).optional(),
  status: z.nativeEnum(HackerStatus).optional(),
});

hackersRouter.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.hackerProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Hacker introuvable");

    const body = updateHackerSchema.parse(req.body);
    const hacker = await prisma.hackerProfile.update({
      where: { id: req.params.id },
      data: body,
      include: { profile: true, badges: true },
    });
    res.json({ hacker });
  }),
);

hackersRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.hackerProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Hacker introuvable");
    await prisma.hackerProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
