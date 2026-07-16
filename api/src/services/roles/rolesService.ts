import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { PERMISSIONS } from "./permissionCatalog.js";

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

export async function createRole(input: { label: string; description?: string; permissionKeys: string[] }) {
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

  return serializeRole(role);
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
