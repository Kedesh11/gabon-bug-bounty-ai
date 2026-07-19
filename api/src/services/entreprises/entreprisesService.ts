import type { EntrepriseStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listEntreprises() {
  return prisma.entrepriseProfile.findMany({ include: { profile: true } });
}

export async function getEntrepriseById(id: string, caller: { id: string; role: string }) {
  const entreprise = await prisma.entrepriseProfile.findUnique({ where: { id }, include: { profile: true } });
  if (!entreprise) throw new HttpError(404, "Entreprise introuvable");

  if (caller.role === "entreprise" && entreprise.profileId !== caller.id) {
    throw new HttpError(403, "Accès refusé");
  }

  return entreprise;
}

export interface UpdateEntrepriseInput {
  sector?: string;
  status?: EntrepriseStatus;
}

export async function updateEntreprise(id: string, caller: { id: string; role: string }, input: UpdateEntrepriseInput) {
  const existing = await prisma.entrepriseProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Entreprise introuvable");

  const isOwner = caller.role === "entreprise" && existing.profileId === caller.id;
  if (!isOwner && caller.role !== "admin") {
    throw new HttpError(403, "Accès refusé");
  }

  return prisma.entrepriseProfile.update({ where: { id }, data: input, include: { profile: true } });
}

export async function deleteEntreprise(id: string) {
  const existing = await prisma.entrepriseProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Entreprise introuvable");
  await prisma.entrepriseProfile.delete({ where: { id } });
}
