import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "./permissionCatalog.js";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  hacker: "Chercheur Élite",
  entreprise: "Partenaire Entreprise",
  triage: "Responsable Triage",
  finance: "Gestionnaire Finance",
  support: "Support Technique",
};

// Idempotent: upserts the permission catalog, the 6 built-in system roles, and their
// default permission assignments. Shared by prisma/backfillRoles.ts (one-off migration)
// and prisma/seed.ts (routine demo-data reset) so the two never drift apart.
export async function seedSystemRolesAndPermissions(prisma: PrismaClient): Promise<Record<string, string>> {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, description: perm.description },
      create: perm,
    });
  }

  const roleIds: Record<string, string> = {};
  for (const [roleKey, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { label: ROLE_LABELS[roleKey], isSystem: true },
      create: { key: roleKey, label: ROLE_LABELS[roleKey], isSystem: true },
    });
    roleIds[roleKey] = role.id;

    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  return roleIds;
}
