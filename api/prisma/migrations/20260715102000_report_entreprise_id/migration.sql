/*
  Warnings:

  - Added the required column `entrepriseId` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "entrepriseId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprise_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
