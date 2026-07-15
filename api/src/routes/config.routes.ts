import { Router } from "express";
import { z } from "zod";
import { PasswordComplexity } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const configRouter = Router();
configRouter.use(requireAuth);

async function getOrCreateConfig() {
  return prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

configRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json({ config });
  }),
);

const updateConfigSchema = z.object({
  platformName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  supportUrl: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  autoTriage: z.boolean().optional(),
  enterpriseValidation: z.boolean().optional(),
  triageLimitHours: z.number().int().nonnegative().optional(),
  aiSensitivity: z.number().int().min(0).max(100).optional(),
  require2FA: z.boolean().optional(),
  ipWhitelisting: z.boolean().optional(),
  sessionTimeout: z.number().int().min(5).max(1440).optional(),
  passwordComplexity: z.nativeEnum(PasswordComplexity).optional(),
});

configRouter.patch(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await getOrCreateConfig();
    const body = updateConfigSchema.parse(req.body);
    const config = await prisma.systemConfig.update({ where: { id: 1 }, data: body });
    res.json({ config });
  }),
);
