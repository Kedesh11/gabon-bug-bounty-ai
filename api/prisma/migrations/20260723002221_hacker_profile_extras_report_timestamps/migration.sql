-- AlterTable
ALTER TABLE "hacker_profiles" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "githubHandle" TEXT,
ADD COLUMN     "twitterHandle" TEXT;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "triagedAt" TIMESTAMP(3);
