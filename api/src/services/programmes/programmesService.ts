import type { ProgrammeStatus, ProgrammeType, ProgrammeValidationStatus, RewardCurrency, SafeHarbor, Severity, TestingPeriod } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

// Full entreprise+profile (email included) — only for the owner's own list and the staff
// review queue, never for anything an anonymous caller can reach.
const entrepriseInclude = { entreprise: { include: { profile: true } } };

// What the public catalogue/detail may show about the company: its display name, nothing
// else (no email, no avatar, no notification prefs). Same `{ profile: { name } }` shape the
// frontend already reads, so the mapper needs no change.
const publicEntrepriseInclude = {
  entreprise: { select: { id: true, sector: true, profile: { select: { name: true } } } },
};

// Internal review bookkeeping that is not for the public.
const publicProgrammeOmit = { validatedById: true, rejectionReason: true, validatedAt: true } as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Generated once at creation from `name`, never regenerated on rename (see the
// `slug` field comment in schema.prisma) — dedupes against every existing slug with
// a numeric suffix rather than rejecting, since an entreprise submitting a program
// with a name that happens to collide shouldn't get a confusing validation error.
async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "programme";
  let slug = base;
  let suffix = 2;
  while (await prisma.programme.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

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
    omit: publicProgrammeOmit,
    include: { rewardTiers: true, ...publicEntrepriseInclude },
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

export interface ProgrammeViewer {
  id: string;
  role: string;
  permissions: string[];
}

// Accepts either the real UUID (old/internal links, e.g. admin tooling that only
// ever knew the id) or the public slug (new shareable links) — resolved by shape,
// so both keep working with no redirect needed.
//
// A programme that is not "valide" is only visible to its owning entreprise and to staff
// who review/manage programmes; everyone else gets the same 404 as for an unknown id, so
// the existence of a pending/refused programme can't be probed. Visible-to-owner/staff
// responses keep the full shape (rejectionReason included, the owner needs it).
export async function getProgrammeById(idOrSlug: string, viewer?: ProgrammeViewer) {
  const programme = await prisma.programme.findUnique({
    where: UUID_RE.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    include: {
      rewardTiers: true,
      targetGroups: { include: { targets: true } },
      announcements: true,
      activities: true,
      ...entrepriseInclude,
    },
  });
  if (!programme) throw new HttpError(404, "Programme introuvable");

  if (programme.validationStatus === "valide") {
    const { validatedById: _v, rejectionReason: _r, validatedAt: _a, ...publicProgramme } = programme;
    const { profile, ...entreprise } = programme.entreprise;
    const isPrivileged = viewer && (await canSeeInternals(viewer, programme));
    if (isPrivileged) return programme;
    return {
      ...publicProgramme,
      entreprise: { id: entreprise.id, sector: entreprise.sector, profile: { name: profile.name } },
    };
  }

  if (!viewer || !(await canSeeInternals(viewer, programme))) {
    throw new HttpError(404, "Programme introuvable");
  }
  return programme;
}

async function canSeeInternals(viewer: ProgrammeViewer, programme: { entrepriseId: string }) {
  if (viewer.permissions.includes("programmes.validate") || viewer.permissions.includes("programmes.manage.view")) {
    return true;
  }
  if (viewer.role === "entreprise") {
    const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: viewer.id } });
    return owned?.id === programme.entrepriseId;
  }
  return false;
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
  const slug = await generateUniqueSlug(input.name);

  const { rewardTiers, entrepriseId: _ignored, ...rest } = input;
  return prisma.programme.create({
    data: {
      ...rest,
      slug,
      entrepriseId,
      // Always starts pending, regardless of anything in the payload — validation
      // can only ever be set via validateProgramme, never at creation.
      validationStatus: "en_attente",
      ...(rewardTiers ? { rewardTiers: { create: rewardTiers } } : {}),
    },
    include: { rewardTiers: true, ...entrepriseInclude },
  });
}

const REVIEWED_FIELDS = [
  "name",
  "description",
  "descriptionLong",
  "scope",
  "outOfScope",
  "methodology",
  "safeHarbor",
  "testingPeriod",
  "minReward",
  "maxReward",
  "rewardCurrency",
] as const;

// Arrays (scope/outOfScope) compare by content: a form that resubmits the unchanged
// programme must not look like an edit.
function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
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

  // What staff approved is the programme's terms (scope, rules, rewards, wording). If the
  // owning entreprise rewrites those on an already-validated programme, it goes back to the
  // review queue instead of staying public with unreviewed terms. Operational toggles
  // (status: actif/pause/ferme) and tags don't need a re-review. Staff edits don't reset it.
  const touchesReviewedTerms =
    rewardTiers !== undefined || REVIEWED_FIELDS.some((field) => rest[field] !== undefined && !sameValue(rest[field], existing[field]));
  const needsRevalidation = caller.role === "entreprise" && existing.validationStatus === "valide" && touchesReviewedTerms;

  const updated = await prisma.programme.update({
    where: { id },
    data: {
      ...rest,
      ...(needsRevalidation
        ? { validationStatus: "en_attente" as const, validatedById: null, validatedAt: null, rejectionReason: null }
        : {}),
      ...(rewardTiers ? { rewardTiers: { deleteMany: {}, create: rewardTiers } } : {}),
    },
    include: { rewardTiers: true, ...entrepriseInclude },
  });

  if (needsRevalidation) {
    await createPlatformLog({
      type: "user_action",
      level: "info",
      message: `Programme "${updated.name}" modifié par son entreprise — renvoyé en validation`,
      source: "programmesService",
      userId: caller.id,
    });
  }

  return updated;
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
