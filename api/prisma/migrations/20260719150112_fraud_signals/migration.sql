/*
  Warnings:

  - Added the required column `updatedAt` to the `hacker_payment_configs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FraudSignalType" AS ENUM ('duplicate_account', 'hacker_entreprise_collusion', 'plagiarized_report', 'payment_anomaly');

-- CreateEnum
CREATE TYPE "FraudSignalStatus" AS ENUM ('open', 'reviewing', 'confirmed', 'dismissed');

-- AlterTable
ALTER TABLE "hacker_payment_configs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "hacker_payment_configs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "fraud_signals" (
    "id" UUID NOT NULL,
    "type" "FraudSignalType" NOT NULL,
    "status" "FraudSignalStatus" NOT NULL DEFAULT 'open',
    "severity" "Severity" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "relatedProfileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedReportId" UUID,
    "relatedPaymentId" UUID,
    "relatedPayoutId" UUID,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_relatedReportId_fkey" FOREIGN KEY ("relatedReportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_relatedPayoutId_fkey" FOREIGN KEY ("relatedPayoutId") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
