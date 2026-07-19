import { Router } from "express";
import { z } from "zod";
import { PasswordComplexity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { getOrCreateConfig, updateConfig } from "../services/config/configService.js";

export const configRouter = Router();
configRouter.use(requireAuth);

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
  // Only meaningful when maintenanceMode is being turned on; the end timestamp is
  // always computed server-side from this so a client can't set an arbitrary date.
  maintenanceDurationHours: z.number().min(1).max(24).optional(),
  autoTriage: z.boolean().optional(),
  enterpriseValidation: z.boolean().optional(),
  triageLimitHours: z.number().int().nonnegative().optional(),
  aiSensitivity: z.number().int().min(0).max(100).optional(),
  require2FA: z.boolean().optional(),
  ipWhitelisting: z.boolean().optional(),
  sessionTimeout: z.number().int().min(5).max(1440).optional(),
  passwordComplexity: z.nativeEnum(PasswordComplexity).optional(),
  globalNotificationsEnabled: z.boolean().optional(),
});

configRouter.patch(
  "/",
  requirePermission("config.write"),
  asyncHandler(async (req, res) => {
    const body = updateConfigSchema.parse(req.body);
    const config = await updateConfig(body);
    res.json({ config });
  }),
);
