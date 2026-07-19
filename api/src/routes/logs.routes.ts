import { Router } from "express";
import { z } from "zod";
import { LogLevel, LogType } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { listPlatformLogs } from "../services/platformLogs/logsService.js";

export const logsRouter = Router();
logsRouter.use(requireAuth, requirePermission("logs.view"));

const listQuerySchema = z.object({
  type: z.nativeEnum(LogType).optional(),
  level: z.nativeEnum(LogLevel).optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

logsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const logs = await listPlatformLogs(query);
    res.json({ logs });
  }),
);
