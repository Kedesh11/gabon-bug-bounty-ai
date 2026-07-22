-- CreateEnum
CREATE TYPE "ProgrammeValidationStatus" AS ENUM ('en_attente', 'valide', 'refuse');

-- AlterTable
ALTER TABLE "programmes" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" UUID,
ADD COLUMN     "validationStatus" "ProgrammeValidationStatus" NOT NULL DEFAULT 'en_attente';

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: programmes that already existed before this gate was introduced were
-- already publicly live — defaulting them to "en_attente" would suddenly hide them.
-- Only newly-submitted programmes (created after this migration) start pending.
UPDATE "programmes" SET "validationStatus" = 'valide';
