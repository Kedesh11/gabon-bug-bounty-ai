import type { PrismaClient } from "@prisma/client";
import { VULNERABILITY_CATEGORIES } from "./vrtCatalog.js";

// Idempotent: safe to call from both a one-off migration script and the routine
// dev-reset seed (prisma/seed.ts), same pattern as seedSystemRolesAndPermissions.
// Two passes because children reference their parent's id, not just its key.
export async function seedVulnerabilityTaxonomy(prisma: PrismaClient): Promise<Record<string, string>> {
  const idByKey: Record<string, string> = {};

  for (const cat of VULNERABILITY_CATEGORIES) {
    const row = await prisma.vulnerabilityCategory.upsert({
      where: { key: cat.key },
      update: { name: cat.name, cweId: cat.cweId, defaultSeverity: cat.defaultSeverity, description: cat.description, isSystem: true },
      create: { key: cat.key, name: cat.name, cweId: cat.cweId, defaultSeverity: cat.defaultSeverity, description: cat.description, isSystem: true },
    });
    idByKey[cat.key] = row.id;
  }

  for (const cat of VULNERABILITY_CATEGORIES) {
    if (!cat.parentKey) continue;
    await prisma.vulnerabilityCategory.update({
      where: { key: cat.key },
      data: { parentId: idByKey[cat.parentKey] },
    });
  }

  return idByKey;
}
