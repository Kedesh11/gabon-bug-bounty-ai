-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'pvit';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "providerTxId" TEXT;

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "providerTxId" TEXT;
