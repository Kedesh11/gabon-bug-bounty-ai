-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "affectedAsset" TEXT,
ADD COLUMN     "cvssScore" DOUBLE PRECISION,
ADD COLUMN     "cvssVector" TEXT,
ADD COLUMN     "impact" TEXT,
ADD COLUMN     "remediation" TEXT,
ADD COLUMN     "stepsToReproduce" TEXT,
ADD COLUMN     "vulnerabilityCategoryId" UUID;

-- CreateTable
CREATE TABLE "vulnerability_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cweId" TEXT,
    "defaultSeverity" "Severity",
    "description" TEXT,
    "parentId" UUID,

    CONSTRAINT "vulnerability_categories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_vulnerabilityCategoryId_fkey" FOREIGN KEY ("vulnerabilityCategoryId") REFERENCES "vulnerability_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_categories" ADD CONSTRAINT "vulnerability_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "vulnerability_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
