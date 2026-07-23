import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listKbArticles,
  getKbArticleById,
  createKbArticle,
  updateKbArticle,
  deleteKbArticle,
} from "../services/kb/kbService.js";

export const kbRouter = Router();
kbRouter.use(requireAuth, requirePermission("support.kb.view"));

const listQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

kbRouter.get(
  "/articles",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const articles = await listKbArticles(query);
    res.json({ articles });
  }),
);

kbRouter.get(
  "/articles/:id",
  asyncHandler(async (req, res) => {
    const article = await getKbArticleById(req.params.id);
    res.json({ article });
  }),
);

const articleSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  body: z.string().min(1),
});

kbRouter.post(
  "/articles",
  requirePermission("kb.manage"),
  asyncHandler(async (req, res) => {
    const body = articleSchema.parse(req.body);
    const article = await createKbArticle(req.user!.id, body);
    res.status(201).json({ article });
  }),
);

const updateSchema = articleSchema.partial();

kbRouter.patch(
  "/articles/:id",
  requirePermission("kb.manage"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const article = await updateKbArticle(req.params.id, body);
    res.json({ article });
  }),
);

kbRouter.delete(
  "/articles/:id",
  requirePermission("kb.manage"),
  asyncHandler(async (req, res) => {
    await deleteKbArticle(req.params.id);
    res.status(204).send();
  }),
);
