import type { Profile, Role, RolePermission, Permission, HackerProfile, EntrepriseProfile } from "@prisma/client";

type ProfileWithRole = Profile & {
  role: Role & { permissions: (RolePermission & { permission: Permission })[] };
  hackerProfile?: HackerProfile | null;
  entrepriseProfile?: EntrepriseProfile | null;
};

// Reshapes a Prisma Profile (with role+permissions included) into the API's public
// contract: a flat `role` key string (not the nested Role row) plus a `permissions`
// array, so the frontend never has to know the roles/permissions schema shape.
export function serializeProfile(profile: ProfileWithRole) {
  const { roleId: _roleId, role, ...rest } = profile;
  return {
    ...rest,
    role: role.key,
    roleLabel: role.label,
    permissions: role.permissions.map((rp) => rp.permission.key),
  };
}

export const profileRoleInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} as const;
