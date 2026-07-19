import { Router } from "express";
import { z } from "zod";
import { ContentValueType } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listContentEntries,
  upsertContentEntry,
  deleteContentEntry,
  listNavbarItems,
  createNavbarItem,
  updateNavbarItem,
  deleteNavbarItem,
  reorderNavbarItems,
  listFooterColumns,
  createFooterColumn,
  updateFooterColumn,
  deleteFooterColumn,
  reorderFooterColumns,
  createFooterLink,
  updateFooterLink,
  deleteFooterLink,
  reorderFooterLinks,
} from "../services/content/contentService.js";

export const contentRouter = Router();

// Public: every visitor's browser needs these before/without any auth, same posture
// as GET /api/programmes and GET /api/taxonomy/vulnerability-categories.
contentRouter.get(
  "/entries",
  asyncHandler(async (_req, res) => {
    const entries = await listContentEntries();
    res.json({ entries });
  }),
);

contentRouter.get(
  "/navbar-items",
  asyncHandler(async (_req, res) => {
    const items = await listNavbarItems(true);
    res.json({ items });
  }),
);

contentRouter.get(
  "/footer-columns",
  asyncHandler(async (_req, res) => {
    const columns = await listFooterColumns();
    res.json({ columns });
  }),
);

contentRouter.use(requireAuth, requirePermission("content.manage"));

// Admin-only listing includes hidden navbar items too (the public one above filters them out).
contentRouter.get(
  "/navbar-items/all",
  asyncHandler(async (_req, res) => {
    const items = await listNavbarItems(false);
    res.json({ items });
  }),
);

const upsertEntrySchema = z.object({
  key: z.string().min(2).max(200),
  type: z.nativeEnum(ContentValueType),
  value: z.string(),
});

contentRouter.put(
  "/entries",
  asyncHandler(async (req, res) => {
    const body = upsertEntrySchema.parse(req.body);
    const entry = await upsertContentEntry(body, req.user!.id);
    res.json({ entry });
  }),
);

contentRouter.delete(
  "/entries/:id",
  asyncHandler(async (req, res) => {
    await deleteContentEntry(req.params.id);
    res.status(204).send();
  }),
);

const navbarItemSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(300),
  isExternal: z.boolean().optional(),
  visible: z.boolean().optional(),
});

contentRouter.post(
  "/navbar-items",
  asyncHandler(async (req, res) => {
    const body = navbarItemSchema.parse(req.body);
    const item = await createNavbarItem(body);
    res.status(201).json({ item });
  }),
);

contentRouter.patch(
  "/navbar-items/:id",
  asyncHandler(async (req, res) => {
    const body = navbarItemSchema.partial().parse(req.body);
    const item = await updateNavbarItem(req.params.id, body);
    res.json({ item });
  }),
);

contentRouter.delete(
  "/navbar-items/:id",
  asyncHandler(async (req, res) => {
    await deleteNavbarItem(req.params.id);
    res.status(204).send();
  }),
);

const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

contentRouter.post(
  "/navbar-items/reorder",
  asyncHandler(async (req, res) => {
    const body = reorderSchema.parse(req.body);
    const items = await reorderNavbarItems(body.ids);
    res.json({ items });
  }),
);

const footerColumnSchema = z.object({ title: z.string().min(1).max(60) });

contentRouter.post(
  "/footer-columns",
  asyncHandler(async (req, res) => {
    const body = footerColumnSchema.parse(req.body);
    const column = await createFooterColumn(body.title);
    res.status(201).json({ column });
  }),
);

contentRouter.patch(
  "/footer-columns/:id",
  asyncHandler(async (req, res) => {
    const body = footerColumnSchema.parse(req.body);
    const column = await updateFooterColumn(req.params.id, body.title);
    res.json({ column });
  }),
);

contentRouter.delete(
  "/footer-columns/:id",
  asyncHandler(async (req, res) => {
    await deleteFooterColumn(req.params.id);
    res.status(204).send();
  }),
);

contentRouter.post(
  "/footer-columns/reorder",
  asyncHandler(async (req, res) => {
    const body = reorderSchema.parse(req.body);
    const columns = await reorderFooterColumns(body.ids);
    res.json({ columns });
  }),
);

const footerLinkSchema = z.object({
  columnId: z.string().uuid(),
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(300),
});

contentRouter.post(
  "/footer-links",
  asyncHandler(async (req, res) => {
    const body = footerLinkSchema.parse(req.body);
    const link = await createFooterLink(body);
    res.status(201).json({ link });
  }),
);

const updateFooterLinkSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  url: z.string().min(1).max(300).optional(),
});

contentRouter.patch(
  "/footer-links/:id",
  asyncHandler(async (req, res) => {
    const body = updateFooterLinkSchema.parse(req.body);
    const link = await updateFooterLink(req.params.id, body);
    res.json({ link });
  }),
);

contentRouter.delete(
  "/footer-links/:id",
  asyncHandler(async (req, res) => {
    await deleteFooterLink(req.params.id);
    res.status(204).send();
  }),
);

const reorderFooterLinksSchema = z.object({ columnId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1) });

contentRouter.post(
  "/footer-links/reorder",
  asyncHandler(async (req, res) => {
    const body = reorderFooterLinksSchema.parse(req.body);
    const columns = await reorderFooterLinks(body.columnId, body.ids);
    res.json({ columns });
  }),
);
