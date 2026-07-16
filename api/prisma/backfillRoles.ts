// One-off data migration (stage 1 -> stage 2 of the roles/permissions schema change).
// Run once after the stage-1 migration (adds Role/Permission/RolePermission + nullable
// Profile.roleId) and before the stage-2 migration (drops the old `role` enum column,
// makes roleId non-null). Idempotent: safe to re-run.
import { PrismaClient } from "@prisma/client";
import { seedSystemRolesAndPermissions } from "../src/services/roles/seedSystemRoles.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding permission catalog + system roles...");
  await seedSystemRolesAndPermissions(prisma);

  console.log("Backfilling Profile.roleId from the old role enum column...");
  const result = await prisma.$executeRaw`
    UPDATE profiles
    SET "roleId" = roles.id
    FROM roles
    WHERE roles.key = profiles.role::text
      AND profiles."roleId" IS NULL
  `;
  console.log(`Backfilled ${result} profile(s).`);

  const stillMissing = await prisma.profile.count({ where: { roleId: null } });
  if (stillMissing > 0) {
    throw new Error(`${stillMissing} profile(s) still have no roleId — refusing to proceed to stage 2.`);
  }

  console.log("Done. Safe to run the stage-2 migration now.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
