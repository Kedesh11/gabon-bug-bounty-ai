import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";

// Deliberately unauthenticated: anonymous visitors (and a not-yet-logged-in admin)
// need to know the maintenance status before any session exists.
export const maintenanceRouter = Router();

maintenanceRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    const active = !!config?.maintenanceMode && !!config.maintenanceUntil && config.maintenanceUntil.getTime() > Date.now();
    res.json({ active, maintenanceUntil: active ? config!.maintenanceUntil : null });
  }),
);
