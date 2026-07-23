import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const complianceItemInclude = {
  completedBy: { select: { id: true, name: true, email: true } },
};

export async function listComplianceItems() {
  return prisma.complianceItem.findMany({ include: complianceItemInclude, orderBy: { createdAt: "asc" } });
}

export async function createComplianceItem(label: string) {
  const trimmed = label.trim();
  if (trimmed.length < 2) throw new HttpError(400, "Le libellé doit contenir au moins 2 caractères");
  return prisma.complianceItem.create({ data: { label: trimmed }, include: complianceItemInclude });
}

export async function toggleComplianceItem(id: string, actorId: string, isDone: boolean) {
  const existing = await prisma.complianceItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Élément de conformité introuvable");

  return prisma.complianceItem.update({
    where: { id },
    data: isDone
      ? { isDone: true, completedById: actorId, completedAt: new Date() }
      : { isDone: false, completedById: null, completedAt: null },
    include: complianceItemInclude,
  });
}

export async function deleteComplianceItem(id: string) {
  const existing = await prisma.complianceItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Élément de conformité introuvable");
  await prisma.complianceItem.delete({ where: { id } });
}
