
-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_roleId_fkey";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "role",
ALTER COLUMN "roleId" SET NOT NULL;

-- DropEnum
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

