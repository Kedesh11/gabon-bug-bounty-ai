-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "aiAnalysisConsent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "system_config" ADD COLUMN     "aiAnalysisEnabled" BOOLEAN NOT NULL DEFAULT false;
