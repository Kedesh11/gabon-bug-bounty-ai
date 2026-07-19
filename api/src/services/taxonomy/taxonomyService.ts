import { randomUUID } from "node:crypto";
import type { Severity } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listVulnerabilityCategories() {
  return prisma.vulnerabilityCategory.findMany({
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(text: string): string {
  return normalizeForComparison(text).replace(/ /g, "_");
}

// Character-level edit distance — no fuzzy-matching library available, and for short
// category names (a few words at most) this catches typos/casing/spacing variants
// ("Xss" vs "XSS", "sql injection" vs "SQL  Injection") far better than token overlap
// would on such short strings.
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

async function findSimilarCategory(name: string) {
  const normalized = normalizeForComparison(name);
  if (!normalized) return null;

  const categories = await prisma.vulnerabilityCategory.findMany();
  let best: { category: (typeof categories)[number]; score: number } | null = null;
  for (const category of categories) {
    const score = similarity(normalized, normalizeForComparison(category.name));
    if (score >= DUPLICATE_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { category, score };
    }
  }
  return best?.category ?? null;
}

// Any hacker can propose a new category from the report form. No moderation queue —
// the automatic duplicate check IS the gate: if an existing category is a close match,
// that one is reused transparently instead of creating a near-duplicate entry, so the
// taxonomy stays usable ("XSS" and "Xss attack" resolve to the same category) without
// needing a human to review every submission.
export async function proposeVulnerabilityCategory(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new HttpError(400, "Le nom de la catégorie doit contenir au moins 2 caractères");

  const duplicate = await findSimilarCategory(trimmed);
  if (duplicate) return { category: duplicate, reused: true };

  const baseKey = slugify(trimmed) || `categorie_${randomUUID().slice(0, 8)}`;
  const collision = await prisma.vulnerabilityCategory.findUnique({ where: { key: baseKey } });
  const key = collision ? `${baseKey}_${randomUUID().slice(0, 6)}` : baseKey;

  const category = await prisma.vulnerabilityCategory.create({
    data: { key, name: trimmed, isSystem: false },
  });
  return { category, reused: false };
}

async function assertNoParentCycle(id: string, proposedParentId: string) {
  if (proposedParentId === id) throw new HttpError(400, "Une catégorie ne peut pas être son propre parent");

  let cursorId: string | null = proposedParentId;
  while (cursorId !== null) {
    const found: { id: string; parentId: string | null } | null = await prisma.vulnerabilityCategory.findUnique({
      where: { id: cursorId },
      select: { id: true, parentId: true },
    });
    if (!found) throw new HttpError(400, "Catégorie parente introuvable");
    if (found.id === id) throw new HttpError(400, "Cette hiérarchie créerait une boucle");
    cursorId = found.parentId;
  }
}

export interface AdminCreateCategoryInput {
  name: string;
  cweId?: string;
  defaultSeverity?: Severity;
  description?: string;
  parentId?: string;
}

// Distinct from proposeVulnerabilityCategory: an admin/triage caller (permission
// taxonomy.manage) gets full control (CWE, severity, hierarchy) and, unlike the
// hacker-facing flow, no automatic fuzzy-merge — they're presumed to know whether
// what they're creating is genuinely distinct from an existing entry.
export async function createVulnerabilityCategoryAsAdmin(input: AdminCreateCategoryInput) {
  const trimmed = input.name.trim();
  if (trimmed.length < 2) throw new HttpError(400, "Le nom de la catégorie doit contenir au moins 2 caractères");

  if (input.parentId) {
    const parent = await prisma.vulnerabilityCategory.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new HttpError(400, "Catégorie parente introuvable");
  }

  const baseKey = slugify(trimmed) || `categorie_${randomUUID().slice(0, 8)}`;
  const collision = await prisma.vulnerabilityCategory.findUnique({ where: { key: baseKey } });
  const key = collision ? `${baseKey}_${randomUUID().slice(0, 6)}` : baseKey;

  return prisma.vulnerabilityCategory.create({
    data: {
      key,
      name: trimmed,
      cweId: input.cweId,
      defaultSeverity: input.defaultSeverity,
      description: input.description,
      parentId: input.parentId,
      isSystem: false,
    },
  });
}

export interface UpdateCategoryInput {
  name?: string;
  cweId?: string | null;
  defaultSeverity?: Severity | null;
  description?: string | null;
  parentId?: string | null;
}

// The main use case beyond simple edits: completing a hacker-proposed category
// (name only, no CWE/severity/hierarchy) with real curation once triage reviews it.
export async function updateVulnerabilityCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.vulnerabilityCategory.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Catégorie introuvable");

  if (input.parentId) await assertNoParentCycle(id, input.parentId);

  const name = input.name?.trim();
  if (name !== undefined && name.length < 2) {
    throw new HttpError(400, "Le nom de la catégorie doit contenir au moins 2 caractères");
  }

  return prisma.vulnerabilityCategory.update({
    where: { id },
    data: { ...input, name },
  });
}

export async function deleteVulnerabilityCategory(id: string) {
  const existing = await prisma.vulnerabilityCategory.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Catégorie introuvable");
  if (existing.isSystem) throw new HttpError(400, "Impossible de supprimer une catégorie du catalogue de base");

  const [reportsCount, childrenCount] = await Promise.all([
    prisma.report.count({ where: { vulnerabilityCategoryId: id } }),
    prisma.vulnerabilityCategory.count({ where: { parentId: id } }),
  ]);
  if (reportsCount > 0) throw new HttpError(409, "Cette catégorie est utilisée par des rapports existants");
  if (childrenCount > 0) throw new HttpError(409, "Cette catégorie a des sous-catégories — réassignez-les d'abord");

  await prisma.vulnerabilityCategory.delete({ where: { id } });
}
