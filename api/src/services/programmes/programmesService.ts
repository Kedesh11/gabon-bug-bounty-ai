import type { ProgrammeStatus, ProgrammeType, ProgrammeValidationStatus, RewardCurrency, SafeHarbor, Severity, TestingPeriod } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

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

// The public catalogue — only programmes a staff member with programmes.validate
// has approved are visible here. Additive to whatever `status` (actif/pause/ferme)
// already meant; unrelated to this gate.
export async function listProgrammes() {
  return prisma.programme.findMany({
    where: { validationStatus: "valide" },
    include: { rewardTiers: true, ...entrepriseInclude },
    orderBy: { createdAt: "desc" },
  });
}

// An entreprise's own programmes, every validation status included — otherwise a
// submitted-but-pending (or refused) programme would be invisible even to its owner.
export async function listMyProgrammes(userId: string) {
  const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: userId } });
  if (!owned) throw new HttpError(403, "Aucun profil entreprise associé à ce compte");

  return prisma.programme.findMany({
    where: { entrepriseId: owned.id },
    include: { rewardTiers: true, ...entrepriseInclude },
    orderBy: { createdAt: "desc" },
  });
}

// Staff review queue — no visibility filter at all (that's the point: staff needs to
// see pending ones), optionally narrowed to one validationStatus.
export async function listProgrammesForReview(filters: { validationStatus?: ProgrammeValidationStatus } = {}) {
  return prisma.programme.findMany({
    where: { validationStatus: filters.validationStatus },
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
      // Always starts pending, regardless of anything in the payload — validation
      // can only ever be set via validateProgramme, never at creation.
      validationStatus: "en_attente",
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

export interface ValidateProgrammeInput {
  decision: "valide" | "refuse";
  rejectionReason?: string;
}

export async function validateProgramme(id: string, actorId: string, input: ValidateProgrammeInput) {
  const existing = await prisma.programme.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Programme introuvable");

  if (input.decision === "refuse" && (!input.rejectionReason || input.rejectionReason.trim().length < 5)) {
    throw new HttpError(400, "Une raison de refus d'au moins 5 caractères est requise");
  }

  const updated = await prisma.programme.update({
    where: { id },
    data: {
      validationStatus: input.decision,
      validatedById: actorId,
      validatedAt: new Date(),
      rejectionReason: input.decision === "refuse" ? input.rejectionReason!.trim() : null,
    },
    include: { rewardTiers: true, ...entrepriseInclude },
  });

  await createPlatformLog({
    type: "user_action",
    level: input.decision === "refuse" ? "warning" : "info",
    message:
      input.decision === "valide"
        ? `Programme "${updated.name}" validé`
        : `Programme "${updated.name}" refusé (${input.rejectionReason!.trim()})`,
    source: "programmesService",
    userId: actorId,
  });

  return updated;
}
