import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const kbArticleInclude = {
  author: { select: { id: true, name: true, email: true } },
};

export interface ListKbArticlesFilters {
  category?: string;
  search?: string;
}

export async function listKbArticles(filters: ListKbArticlesFilters = {}) {
  return prisma.kbArticle.findMany({
    where: {
      category: filters.category,
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" as const } },
              { body: { contains: filters.search, mode: "insensitive" as const } },
              { category: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: kbArticleInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getKbArticleById(id: string) {
  const article = await prisma.kbArticle.findUnique({ where: { id }, include: kbArticleInclude });
  if (!article) throw new HttpError(404, "Article introuvable");
  return article;
}

export interface KbArticleInput {
  title: string;
  category: string;
  body: string;
}

export async function createKbArticle(authorId: string, input: KbArticleInput) {
  return prisma.kbArticle.create({
    data: { title: input.title.trim(), category: input.category.trim(), body: input.body.trim(), authorId },
    include: kbArticleInclude,
  });
}

export async function updateKbArticle(id: string, input: Partial<KbArticleInput>) {
  const existing = await prisma.kbArticle.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Article introuvable");

  return prisma.kbArticle.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      category: input.category?.trim(),
      body: input.body?.trim(),
    },
    include: kbArticleInclude,
  });
}

export async function deleteKbArticle(id: string) {
  const existing = await prisma.kbArticle.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Article introuvable");
  await prisma.kbArticle.delete({ where: { id } });
}
