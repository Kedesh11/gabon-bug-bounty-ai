import { Router } from "express";
import { z } from "zod";
import { FraudSignalStatus, FraudSignalType } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { listFraudSignals, runFraudScan, updateFraudSignalStatus } from "../services/fraud/fraudService.js";

export const fraudRouter = Router();
fraudRouter.use(requireAuth, requirePermission("fraud.review"));

const listQuerySchema = z.object({
  status: z.nativeEnum(FraudSignalStatus).optional(),
  type: z.nativeEnum(FraudSignalType).optional(),
});

fraudRouter.get(
  "/signals",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const signals = await listFraudSignals(query);
    res.json({ signals });
  }),
);

const updateStatusSchema = z.object({
  status: z.nativeEnum(FraudSignalStatus),
});

fraudRouter.patch(
  "/signals/:id",
  asyncHandler(async (req, res) => {
    const body = updateStatusSchema.parse(req.body);
    const signal = await updateFraudSignalStatus(req.params.id, req.user!.id, body.status);
    res.json({ signal });
  }),
);

// Heuristics are batch/O(n²) in places (plagiarism scan) — deliberately not run on
// every report/payout creation, only on demand from the admin fraud page.
fraudRouter.post(
  "/scan",
  asyncHandler(async (_req, res) => {
    const created = await runFraudScan();
    res.status(201).json({ created: created.length, signals: created });
  }),
);
