import { Router } from "express";
import { z } from "zod";
import { Severity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listVulnerabilityCategories,
  proposeVulnerabilityCategory,
  createVulnerabilityCategoryAsAdmin,
  updateVulnerabilityCategory,
  deleteVulnerabilityCategory,
} from "../services/taxonomy/taxonomyService.js";

export const taxonomyRouter = Router();

// Public: the form needs this before/without auth friction. Includes both the
// curated seed catalog and everything hackers/admins have added since.
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

const adminCreateSchema = z.object({
  name: z.string().min(2).max(100),
  cweId: z.string().optional(),
  defaultSeverity: z.nativeEnum(Severity).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

// Full control, no fuzzy-merge — distinct from the hacker propose flow above. Also
// how triage/admin complete a hacker-proposed category (create is one way in; the
// more common path is PATCH-ing an existing name-only entry, see below).
taxonomyRouter.post(
  "/vulnerability-categories/manage",
  requireAuth,
  requirePermission("taxonomy.manage"),
  asyncHandler(async (req, res) => {
    const body = adminCreateSchema.parse(req.body);
    const category = await createVulnerabilityCategoryAsAdmin(body);
    res.status(201).json({ category });
  }),
);

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cweId: z.string().nullable().optional(),
  defaultSeverity: z.nativeEnum(Severity).nullable().optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

taxonomyRouter.patch(
  "/vulnerability-categories/:id",
  requireAuth,
  requirePermission("taxonomy.manage"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const category = await updateVulnerabilityCategory(req.params.id, body);
    res.json({ category });
  }),
);

taxonomyRouter.delete(
  "/vulnerability-categories/:id",
  requireAuth,
  requirePermission("taxonomy.manage"),
  asyncHandler(async (req, res) => {
    await deleteVulnerabilityCategory(req.params.id);
    res.status(204).send();
  }),
);
