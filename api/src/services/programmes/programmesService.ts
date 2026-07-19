import type { ProgrammeStatus, ProgrammeType, RewardCurrency, SafeHarbor, Severity, TestingPeriod } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const entrepriseInclude = { entreprise: { include: { profile: true } } };

export async function resolveEntrepriseId(userId: string, role: string, requestedId?: string) {
  if (role === "admin") {
    if (!requestedId) throw new HttpError(400, "entrepriseId requis pour un admin");
    return requestedId;
  }
  const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: userId } });
  if (!owned) throw new HttpError(403, "Aucun profil entreprise associé à ce compte");
  return owned.id;
}

export async function listProgrammes() {
  return prisma.programme.findMany({
    include: { rewardTiers: true, ...entrepriseInclude },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProgrammeById(id: string) {
  const programme = await prisma.programme.findUnique({
    where: { id },
    include: {
      rewardTiers: true,
      targetGroups: { include: { targets: true } },
      announcements: true,
      activities: true,
      ...entrepriseInclude,
    },
  });
  if (!programme) throw new HttpError(404, "Programme introuvable");
  return programme;
}

interface RewardTierInput {
  severity: Severity;
  min: number;
  max: number;
  note?: string;
}

export interface ProgrammeInput {
  name: string;
  description: string;
  descriptionLong?: string;
  scope: string[];
  outOfScope: string[];
  methodology?: string;
  tags: string[];
  sector?: string;
  website?: string;
  safeHarbor?: SafeHarbor;
  testingPeriod?: TestingPeriod;
  programType: ProgrammeType;
  minReward: number;
  maxReward: number;
  rewardCurrency: RewardCurrency;
  triageTimeHours?: number;
  firstResponseHours?: number;
  resolutionDays?: number;
  status: ProgrammeStatus;
  rewardTiers?: RewardTierInput[];
  entrepriseId?: string;
}

export async function createProgramme(userId: string, role: string, input: ProgrammeInput) {
  const entrepriseId = await resolveEntrepriseId(userId, role, input.entrepriseId);

  const { rewardTiers, entrepriseId: _ignored, ...rest } = input;
  return prisma.programme.create({
    data: {
      ...rest,
      entrepriseId,
      ...(rewardTiers ? { rewardTiers: { create: rewardTiers } } : {}),
    },
    include: { rewardTiers: true, ...entrepriseInclude },
  });
}

export async function updateProgramme(
  id: string,
  caller: { id: string; role: string },
  input: Partial<ProgrammeInput>,
) {
  const existing = await prisma.programme.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Programme introuvable");

  if (caller.role === "entreprise") {
    const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: caller.id } });
    if (!owned || owned.id !== existing.entrepriseId) {
      throw new HttpError(403, "Ce programme n'appartient pas à votre entreprise");
    }
  }

  const { rewardTiers, entrepriseId: _ignored, ...rest } = input;

  return prisma.programme.update({
    where: { id },
    data: {
      ...rest,
      ...(rewardTiers ? { rewardTiers: { deleteMany: {}, create: rewardTiers } } : {}),
    },
    include: { rewardTiers: true, ...entrepriseInclude },
  });
}

export async function deleteProgramme(id: string) {
  const existing = await prisma.programme.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Programme introuvable");
  await prisma.programme.delete({ where: { id } });
}
