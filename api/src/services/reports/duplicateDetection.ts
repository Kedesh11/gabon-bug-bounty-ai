import { prisma } from "../../prisma.js";

// v1: exact match only, no fuzzy text similarity — same programme + same taxonomy
// category + same normalized affected asset. Deliberately conservative: without
// labelled data to calibrate a similarity threshold, a fuzzy match would trade
// false negatives for false positives we have no way to tune against. This is
// also the base case Phase 5's cross-programme plagiarism check builds on top of.
export function normalizeAsset(asset: string): string {
  return asset.trim().toLowerCase();
}

export interface DuplicateMatch {
  reportId: string;
  createdAt: Date;
}

// Returns the earliest existing report matching on (programme, category, asset), if
// any — this is the "first to report" record that should win validation/payout.
// Requires both a category and an asset: reports missing either (legacy free-text
// submissions, or categories that don't apply a fixed asset) are never compared.
export async function findEarlierDuplicate(params: {
  programmeId: string;
  vulnerabilityCategoryId: string | null | undefined;
  affectedAsset: string | null | undefined;
}): Promise<DuplicateMatch | null> {
  if (!params.vulnerabilityCategoryId || !params.affectedAsset) return null;

  const normalizedAsset = normalizeAsset(params.affectedAsset);
  if (!normalizedAsset) return null;

  const candidates = await prisma.report.findMany({
    where: {
      programmeId: params.programmeId,
      vulnerabilityCategoryId: params.vulnerabilityCategoryId,
    },
    select: { id: true, affectedAsset: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const earliest = candidates.find((c) => c.affectedAsset && normalizeAsset(c.affectedAsset) === normalizedAsset);
  return earliest ? { reportId: earliest.id, createdAt: earliest.createdAt } : null;
}
