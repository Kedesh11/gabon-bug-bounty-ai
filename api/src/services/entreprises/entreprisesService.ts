import type { EntrepriseStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import type { AuthenticatedUser } from "../../middleware/auth.js";

export async function listEntreprises() {
  return prisma.entrepriseProfile.findMany({ include: { profile: true } });
}

// Staff who administer or look up accounts (not "role === admin": any role granted these
// permissions gets the access, same as everywhere else in the API).
function canAdministerEntreprises(user: AuthenticatedUser) {
  return user.permissions.includes("entreprises.manage") || user.permissions.includes("users.view");
}

// An entreprise record carries the company's login email: only its owner and staff may read
// it — never another entreprise, and never a hacker.
export async function getEntrepriseById(id: string, caller: AuthenticatedUser) {
  const entreprise = await prisma.entrepriseProfile.findUnique({ where: { id }, include: { profile: true } });
  if (!entreprise) throw new HttpError(404, "Entreprise introuvable");

  if (entreprise.profileId !== caller.id && !canAdministerEntreprises(caller)) {
    throw new HttpError(403, "Accès refusé");
  }

  return entreprise;
}

export interface UpdateEntrepriseInput {
  sector?: string;
  status?: EntrepriseStatus;
}

export async function updateEntreprise(id: string, caller: AuthenticatedUser, input: UpdateEntrepriseInput) {
  const existing = await prisma.entrepriseProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Entreprise introuvable");

  const isOwner = existing.profileId === caller.id;
  const isStaff = caller.permissions.includes("entreprises.manage");
  if (!isOwner && !isStaff) {
    throw new HttpError(403, "Accès refusé");
  }
  // Suspension is a moderation decision: without this an entreprise could lift its own.
  if (input.status !== undefined && !isStaff) {
    throw new HttpError(403, "Seul le staff peut modifier le statut d'une entreprise");
  }

  return prisma.entrepriseProfile.update({ where: { id }, data: input, include: { profile: true } });
}

// Removes the whole account (profile + login), not just the entreprise row: leaving the
// Profile and its Supabase user behind kept a deleted company able to sign in. Refused when
// money moved through it — payments cascade with the entreprise, and erasing financial
// records is not something an account deletion should do; suspend the account instead.
export async function deleteEntreprise(id: string) {
  const existing = await prisma.entrepriseProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Entreprise introuvable");

  const payments = await prisma.payment.count({ where: { entrepriseId: id } });
  if (payments > 0) {
    throw new HttpError(409, `Suppression impossible : ${payments} paiement(s) sont liés à cette entreprise. Suspendez le compte plutôt que de l'effacer.`);
  }

  await prisma.profile.delete({ where: { id: existing.profileId } });
  await supabaseAdmin.auth.admin.deleteUser(existing.profileId);
}
