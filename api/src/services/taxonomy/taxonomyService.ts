import { prisma } from "../../prisma.js";

export async function listVulnerabilityCategories() {
  return prisma.vulnerabilityCategory.findMany({
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}
