-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('hacker', 'entreprise', 'admin', 'triage', 'finance', 'support');

-- CreateEnum
CREATE TYPE "HackerStatus" AS ENUM ('actif', 'banni', 'suspendu');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('mobile_money', 'bank_transfer', 'bank_card', 'paypal', 'crypto');

-- CreateEnum
CREATE TYPE "MobileMoneyProvider" AS ENUM ('airtel', 'mtn', 'moov', 'orange');

-- CreateEnum
CREATE TYPE "CryptoType" AS ENUM ('btc', 'eth', 'usdt');

-- CreateEnum
CREATE TYPE "PreferredCurrency" AS ENUM ('USD', 'EUR', 'XAF');

-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('visa', 'mastercard', 'amex', 'other');

-- CreateEnum
CREATE TYPE "EntrepriseStatus" AS ENUM ('actif', 'suspendu');

-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('actif', 'pause', 'ferme');

-- CreateEnum
CREATE TYPE "ProgrammeType" AS ENUM ('public', 'private', 'vdp');

-- CreateEnum
CREATE TYPE "SafeHarbor" AS ENUM ('partiel', 'complet', 'aucun');

-- CreateEnum
CREATE TYPE "TestingPeriod" AS ENUM ('ongoing', 'scheduled', 'closed');

-- CreateEnum
CREATE TYPE "RewardCurrency" AS ENUM ('USD', 'EUR', 'XAF');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critique', 'haute', 'moyenne', 'faible', 'info');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('submission', 'reward', 'announcement', 'update');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('soumis', 'en_analyse', 'accepte', 'rejete', 'resolu');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('en_attente', 'en_cours', 'terminee');

-- CreateEnum
CREATE TYPE "PasswordComplexity" AS ENUM ('standard', 'elevated', 'military');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('security', 'performance', 'user_action', 'system');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hacker_profiles" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "bugsFound" INTEGER NOT NULL DEFAULT 0,
    "totalRewards" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "HackerStatus" NOT NULL DEFAULT 'actif',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hacker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "hackerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hacker_payment_configs" (
    "id" UUID NOT NULL,
    "hackerId" UUID NOT NULL,
    "gainsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[],
    "mobileMoneyProvider" "MobileMoneyProvider",
    "phoneNumber" TEXT,
    "accountName" TEXT,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "iban" TEXT,
    "swiftCode" TEXT,
    "bankCountry" TEXT,
    "cardBrand" "CardBrand",
    "cardHolderName" TEXT,
    "cardNumberLast4" TEXT,
    "cardExpiry" TEXT,
    "cardBillingCountry" TEXT,
    "paypalEmail" TEXT,
    "cryptoType" "CryptoType",
    "walletAddress" TEXT,
    "preferredCurrency" "PreferredCurrency" NOT NULL DEFAULT 'USD',
    "autoWithdrawal" BOOLEAN NOT NULL DEFAULT false,
    "minimumPayoutThreshold" TEXT NOT NULL DEFAULT '50',

    CONSTRAINT "hacker_payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entreprise_profiles" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "sector" TEXT NOT NULL,
    "programmesCount" INTEGER NOT NULL DEFAULT 0,
    "totalPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "EntrepriseStatus" NOT NULL DEFAULT 'actif',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entreprise_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "entrepriseId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionLong" TEXT,
    "overview" TEXT,
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outOfScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "methodology" TEXT,
    "eligibility" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "howItWorks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibleDisclosure" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rulesOfEngagement" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hardwareResearchRegistration" TEXT,
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nonQualifyingFindings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disclosurePolicy" TEXT,
    "communicationChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sector" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "safeHarbor" "SafeHarbor",
    "scopeRating" INTEGER,
    "testingPeriod" "TestingPeriod",
    "startedAt" TIMESTAMP(3),
    "statusText" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "vulnerabilitiesRewarded" INTEGER,
    "validationWithinDays" INTEGER,
    "acceptanceRate" INTEGER,
    "averagePayout" INTEGER,
    "averagePayoutWindow" TEXT,
    "programType" "ProgrammeType" NOT NULL DEFAULT 'public',
    "minReward" INTEGER NOT NULL,
    "maxReward" INTEGER NOT NULL,
    "rewardCurrency" "RewardCurrency" NOT NULL DEFAULT 'XAF',
    "payoutGuidelines" TEXT,
    "payoutFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rootAccessProgram" TEXT,
    "hallOfFamers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentlyJoined" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalResearchers" INTEGER,
    "additionalInformation" TEXT,
    "thingsToKnow" JSONB,
    "triageTimeHours" INTEGER,
    "firstResponseHours" INTEGER,
    "resolutionDays" INTEGER,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'actif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_tiers" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "severity" "Severity" NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "reward_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_groups" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scopeRating" TEXT,
    "inScope" BOOLEAN NOT NULL,
    "payoutChart" JSONB,

    CONSTRAINT "target_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_targets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "knownIssues" TEXT,
    "targetGroupId" UUID,
    "inScopeProgrammeId" UUID,
    "outOfScopeProgrammeId" UUID,

    CONSTRAINT "programme_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "type" "ActivityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" "Severity",
    "amount" INTEGER,
    "hackerName" TEXT,
    "programmeName" TEXT,
    "programmeId" UUID,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'soumis',
    "hackerId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vulnerability" TEXT NOT NULL,
    "vrtCategory" TEXT,
    "vrtType" TEXT,
    "proof" TEXT NOT NULL,
    "pdfFileName" TEXT,
    "analysisStatus" "AnalysisStatus",

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "suggestedSeverity" "Severity" NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" UUID,
    "summary" TEXT NOT NULL,
    "reproductionLikelihood" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL DEFAULT 'Gabon Bug Bounty AI',
    "contactEmail" TEXT NOT NULL DEFAULT 'admin@bugbounty.ga',
    "supportUrl" TEXT NOT NULL DEFAULT 'https://support.bugbounty.ga',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "autoTriage" BOOLEAN NOT NULL DEFAULT true,
    "enterpriseValidation" BOOLEAN NOT NULL DEFAULT true,
    "triageLimitHours" INTEGER NOT NULL DEFAULT 48,
    "aiSensitivity" INTEGER NOT NULL DEFAULT 75,
    "require2FA" BOOLEAN NOT NULL DEFAULT false,
    "ipWhitelisting" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 60,
    "passwordComplexity" "PasswordComplexity" NOT NULL DEFAULT 'standard',

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_logs" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LogType" NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" UUID,

    CONSTRAINT "platform_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hacker_profiles_profileId_key" ON "hacker_profiles"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "hacker_payment_configs_hackerId_key" ON "hacker_payment_configs"("hackerId");

-- CreateIndex
CREATE UNIQUE INDEX "entreprise_profiles_profileId_key" ON "entreprise_profiles"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_reportId_key" ON "ai_analyses"("reportId");

-- AddForeignKey
ALTER TABLE "hacker_profiles" ADD CONSTRAINT "hacker_profiles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_hackerId_fkey" FOREIGN KEY ("hackerId") REFERENCES "hacker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hacker_payment_configs" ADD CONSTRAINT "hacker_payment_configs_hackerId_fkey" FOREIGN KEY ("hackerId") REFERENCES "hacker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entreprise_profiles" ADD CONSTRAINT "entreprise_profiles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprise_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tiers" ADD CONSTRAINT "reward_tiers_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_groups" ADD CONSTRAINT "target_groups_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_targets" ADD CONSTRAINT "programme_targets_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "target_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_targets" ADD CONSTRAINT "programme_targets_inScopeProgrammeId_fkey" FOREIGN KEY ("inScopeProgrammeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_targets" ADD CONSTRAINT "programme_targets_outOfScopeProgrammeId_fkey" FOREIGN KEY ("outOfScopeProgrammeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_hackerId_fkey" FOREIGN KEY ("hackerId") REFERENCES "hacker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_logs" ADD CONSTRAINT "platform_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
