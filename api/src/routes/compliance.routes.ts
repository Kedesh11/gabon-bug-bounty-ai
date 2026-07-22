import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listComplianceItems,
  createComplianceItem,
  toggleComplianceItem,
  deleteComplianceItem,
} from "../services/compliance/complianceService.js";

export const complianceRouter = Router();
complianceRouter.use(requireAuth, requirePermission("compliance.manage"));

complianceRouter.get(
  "/items",
  asyncHandler(async (_req, res) => {
    const items = await listComplianceItems();
    res.json({ items });
  }),
);

const createSchema = z.object({ label: z.string().min(2) });

complianceRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const item = await createComplianceItem(body.label);
    res.status(201).json({ item });
  }),
);

const toggleSchema = z.object({ isDone: z.boolean() });

complianceRouter.patch(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const body = toggleSchema.parse(req.body);
    const item = await toggleComplianceItem(req.params.id, req.user!.id, body.isDone);
    res.json({ item });
  }),
);

complianceRouter.delete(
  "/items/:id",
  asyncHandler(async (req, res) => {
    await deleteComplianceItem(req.params.id);
    res.status(204).send();
  }),
);
