import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { listVulnerabilityCategories } from "../services/taxonomy/taxonomyService.js";

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
