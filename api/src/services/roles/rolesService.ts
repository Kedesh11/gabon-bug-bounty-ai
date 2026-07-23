import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { PERMISSIONS } from "./permissionCatalog.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { serializeProfile, profileRoleInclude } from "../../lib/serializeProfile.js";
import { sendStaffCredentialsEmail } from "../../lib/mailer.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

const roleInclude = { permissions: { include: { permission: true } } };

function serializeRole(role: { id: string; key: string; label: string; description: string | null; isSystem: boolean; permissions: { permission: { key: string } }[] }) {
  return {
    id: role.id,
    key: role.key,
    label: role.label,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((rp) => rp.permission.key),
  };
}

export async function listPermissions() {
  return PERMISSIONS;
}

export async function listRoles() {
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: { createdAt: "asc" } });
  return roles.map(serializeRole);
}

function assertKnownPermissionKeys(keys: string[]) {
  const valid = new Set(PERMISSIONS.map((p) => p.key));
  const unknown = keys.filter((k) => !valid.has(k));
  if (unknown.length > 0) {
    throw new HttpError(400, `Permission(s) inconnue(s) : ${unknown.join(", ")}`);
  }
}

// Role keys double as machine identifiers referenced nowhere in code (unlike permission
// keys) — any slug is fine as long as it's unique and URL/JSON-safe.
function slugifyKey(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface ProvisionStaffAccountInput {
  name: string;
  email: string;
  password: string;
  message?: string;
}

// Shared by createRole (new role + its first account) and addStaffAccountToRole
// (a second/third account under an already-existing role, e.g. a second finance
// person) — the account-provisioning half is identical either way. Never deletes
// the Role itself on failure: that's the caller's responsibility, since a brand-new
// role has 0 profiles and is safe to roll back, while an existing role may already
// have other accounts on it.
async function provisionStaffAccount(roleId: string, roleLabel: string, input: ProvisionStaffAccountInput) {
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new HttpError(400, createError?.message ?? "Impossible de créer le compte");
  }

  let profile;
  try {
    profile = await prisma.profile.create({
      data: { id: created.user.id, email: input.email, name: input.name, roleId },
      include: profileRoleInclude,
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    throw err;
  }

  const { sent: emailSent, error: emailError } = await sendStaffCredentialsEmail({
    to: input.email,
    roleLabel,
    email: input.email,
    password: input.password,
    message: input.message,
  });

  await createPlatformLog({
    type: "security",
    level: "info",
    message: `Compte staff créé pour le rôle "${roleLabel}" (${input.email})`,
    source: "rolesService",
    userId: profile.id,
  });

  return { profile: serializeProfile(profile), emailSent, emailError };
}

export interface CreateRoleInput extends ProvisionStaffAccountInput {
  label: string;
  description?: string;
  permissionKeys: string[];
}

// Creating a role always provisions its first staff account in the same step — there
// is no path in this platform for a bare role template with nobody holding it yet.
// Only hacker/entreprise self-register (auth.routes.ts); every other role is
// provisioned by a superadmin here.
export async function createRole(input: CreateRoleInput) {
  assertKnownPermissionKeys(input.permissionKeys);

  const key = slugifyKey(input.label);
  if (!key) throw new HttpError(400, "Le nom du rôle doit contenir au moins un caractère alphanumérique");

  const existing = await prisma.role.findUnique({ where: { key } });
  if (existing) throw new HttpError(409, `Un rôle avec la clé "${key}" existe déjà`);

  const permissions = await prisma.permission.findMany({ where: { key: { in: input.permissionKeys } } });

  const role = await prisma.role.create({
    data: {
      key,
      label: input.label,
      description: input.description,
      isSystem: false,
      permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
    include: roleInclude,
  });

  try {
    const { profile, emailSent, emailError } = await provisionStaffAccount(role.id, input.label, input);
    return { role: serializeRole(role), profile, emailSent, emailError };
  } catch (err) {
    await prisma.role.delete({ where: { id: role.id } });
    throw err;
  }
}

// Adds another account under an already-existing role (e.g. a second finance
// person) — the gap createRole alone doesn't cover, since it always mints a new role.
export async function addStaffAccountToRole(roleId: string, input: ProvisionStaffAccountInput) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError(404, "Rôle introuvable");
  return provisionStaffAccount(roleId, role.label, input);
}

// Every real staff account (i.e. not hacker/entreprise, which have their own
// self-service listing under /api/hackers and /api/entreprises) — backs the "Équipe"
// tab. "Dernière connexion" is derived from the real Phase A audit log rather than a
// new tracking column: PlatformLog already records every successful login.
export async function listStaffAccounts() {
  const profiles = await prisma.profile.findMany({
    where: { role: { key: { notIn: ["hacker", "entreprise"] } } },
    include: profileRoleInclude,
    orderBy: { createdAt: "desc" },
  });

  const loginLogs = await prisma.platformLog.findMany({
    where: {
      userId: { in: profiles.map((p) => p.id) },
      type: "security",
      message: { contains: "Connexion réussie" },
    },
    orderBy: { timestamp: "desc" },
    select: { userId: true, timestamp: true },
  });
  const lastLoginByUserId = new Map<string, Date>();
  for (const log of loginLogs) {
    if (log.userId && !lastLoginByUserId.has(log.userId)) lastLoginByUserId.set(log.userId, log.timestamp);
  }

  return profiles.map((p) => ({
    ...serializeProfile(p),
    lastLoginAt: lastLoginByUserId.get(p.id)?.toISOString() ?? null,
  }));
}

export async function deleteStaffAccount(profileId: string, actorId: string) {
  if (profileId === actorId) throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");

  const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: { role: true } });
  if (!profile) throw new HttpError(404, "Compte introuvable");
  if (profile.role.key === "hacker" || profile.role.key === "entreprise") {
    throw new HttpError(400, "Utilisez /api/hackers ou /api/entreprises pour ce type de compte");
  }

  await prisma.profile.delete({ where: { id: profileId } });
  await supabaseAdmin.auth.admin.deleteUser(profileId);

  await createPlatformLog({
    type: "security",
    level: "warning",
    message: `Compte staff "${profile.email}" supprimé`,
    source: "rolesService",
    userId: actorId,
  });
}

export async function updateRolePermissions(roleId: string, permissionKeys: string[]) {
  assertKnownPermissionKeys(permissionKeys);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError(404, "Rôle introuvable");

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId, permissionId: p.id })) }),
  ]);

  const updated = await prisma.role.findUniqueOrThrow({ where: { id: roleId }, include: roleInclude });
  return serializeRole(updated);
}

export async function deleteRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new HttpError(404, "Rôle introuvable");
  if (role.isSystem) throw new HttpError(400, "Les rôles fournis avec la plateforme ne peuvent pas être supprimés");

  const assignedCount = await prisma.profile.count({ where: { roleId } });
  if (assignedCount > 0) {
    throw new HttpError(409, `${assignedCount} compte(s) utilisent encore ce rôle — réassignez-les avant de le supprimer`);
  }

  await prisma.role.delete({ where: { id: roleId } });
}
