import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { listVulnerabilityCategories, proposeVulnerabilityCategory } from "../services/taxonomy/taxonomyService.js";

export const taxonomyRouter = Router();

// Public: the form needs this before/without auth friction, and the catalog itself
// is fixed/code-defined (not sensitive), same rationale as public programme listing.
taxonomyRouter.get(
  "/vulnerability-categories",
  asyncHandler(async (_req, res) => {
    const categories = await listVulnerabilityCategories();
    res.json({ categories });
  }),
);

const proposeSchema = z.object({ name: z.string().min(2).max(100) });

// Same permission as submitting a report — a hacker proposing a category is part of
// their own submission flow, not a separate privilege. No moderation queue: the
// automatic duplicate check (taxonomyService.ts) is what keeps the catalog clean.
taxonomyRouter.post(
  "/vulnerability-categories",
  requireAuth,
  requirePermission("reports.create"),
  asyncHandler(async (req, res) => {
    const body = proposeSchema.parse(req.body);
    const result = await proposeVulnerabilityCategory(body.name);
    res.status(result.reused ? 200 : 201).json(result);
  }),
);
