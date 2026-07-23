import { Router } from "express";
import { z } from "zod";
import { PasswordComplexity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { getOrCreateConfig, updateConfig } from "../services/config/configService.js";
import { env } from "../env.js";

export const configRouter = Router();

// Deliberately unauthenticated and registered before the requireAuth gate below:
// public pages (Navbar/FooterSection) need the platform name before any session
// exists, same posture as maintenance.routes.ts. Only the brand name is exposed —
// every other SystemConfig field stays behind requireAuth.
configRouter.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json({ platformName: config.platformName });
  }),
);

configRouter.use(requireAuth);

configRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json({ config });
  }),
);

// Booleans only — never the actual secret values. Replaces the old "Intégrations"
// tab's fake connect/disconnect toggles with the real configuration state of every
// external provider this platform actually integrates with.
configRouter.get(
  "/integrations",
  requirePermission("settings.view"),
  asyncHandler(async (_req, res) => {
    res.json({
      integrations: {
        stripe: Boolean(env.STRIPE_SECRET_KEY) && Boolean(env.STRIPE_WEBHOOK_SECRET),
        cinetpayCheckout: Boolean(env.CINETPAY_API_KEY) && Boolean(env.CINETPAY_SITE_ID),
        cinetpayTransfer: Boolean(env.CINETPAY_TRANSFER_LOGIN) && Boolean(env.CINETPAY_TRANSFER_PASSWORD),
        openrouter: Boolean(env.OPENROUTER_API_KEY),
        resend: Boolean(env.RESEND_API_KEY),
      },
    });
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
