-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('passeport_recto', 'passeport_verso', 'justificatif_domicile', 'photo_identite');

-- CreateEnum
CREATE TYPE "KycDocumentStatus" AS ENUM ('en_attente', 'valide', 'rejete');

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "type" "KycDocumentType" NOT NULL,
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'en_attente',
    "subjectId" UUID NOT NULL,
    "fileName" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
