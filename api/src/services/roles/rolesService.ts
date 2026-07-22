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

export interface CreateRoleInput {
  label: string;
  description?: string;
  permissionKeys: string[];
  // Creating a role always provisions its first staff account in the same step — there
  // is no path in this platform for a bare role template with nobody holding it yet.
  // Only hacker/entreprise self-register (auth.routes.ts); every other role is
  // provisioned by a superadmin here.
  name: string;
  email: string;
  password: string;
  message?: string;
}

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

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    await prisma.role.delete({ where: { id: role.id } });
    throw new HttpError(400, createError?.message ?? "Impossible de créer le compte");
  }

  let profile;
  try {
    profile = await prisma.profile.create({
      data: { id: created.user.id, email: input.email, name: input.name, roleId: role.id },
      include: profileRoleInclude,
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    await prisma.role.delete({ where: { id: role.id } });
    throw err;
  }

  const { sent: emailSent, error: emailError } = await sendStaffCredentialsEmail({
    to: input.email,
    roleLabel: input.label,
    email: input.email,
    password: input.password,
    message: input.message,
  });

  await createPlatformLog({
    type: "security",
    level: "info",
    message: `Compte staff créé pour le rôle "${input.label}" (${input.email})`,
    source: "rolesService",
    userId: profile.id,
  });

  return { role: serializeRole(role), profile: serializeProfile(profile), emailSent, emailError };
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
