import type { KycDocumentStatus, KycDocumentType } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

const kycDocumentInclude = {
  subject: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

export interface ListKycDocumentsFilters {
  subjectId?: string;
  status?: KycDocumentStatus;
}

export async function listKycDocuments(filters: ListKycDocumentsFilters = {}) {
  return prisma.kycDocument.findMany({
    where: { subjectId: filters.subjectId, status: filters.status },
    include: kycDocumentInclude,
    orderBy: { createdAt: "desc" },
  });
}

export interface SubmitKycDocumentInput {
  type: KycDocumentType;
  fileName?: string;
}

// Self-service: a hacker/entreprise submits their own document. Re-submitting the
// same type replaces the previous row (upsert on the [subjectId, type] pair) rather
// than piling up duplicates — matches how a real "upload my passport" flow behaves:
// only the latest submission per document type matters for review.
export async function submitKycDocument(subjectId: string, input: SubmitKycDocumentInput) {
  const existing = await prisma.kycDocument.findFirst({ where: { subjectId, type: input.type } });
  if (existing) {
    return prisma.kycDocument.update({
      where: { id: existing.id },
      data: { fileName: input.fileName, status: "en_attente", reviewedById: null, reviewedAt: null, reviewNote: null },
      include: kycDocumentInclude,
    });
  }
  return prisma.kycDocument.create({
    data: { subjectId, type: input.type, fileName: input.fileName },
    include: kycDocumentInclude,
  });
}

export interface ReviewKycDocumentInput {
  status: Extract<KycDocumentStatus, "valide" | "rejete">;
  reviewNote?: string;
}

export async function reviewKycDocument(id: string, reviewerId: string, input: ReviewKycDocumentInput) {
  const existing = await prisma.kycDocument.findUnique({ where: { id }, include: kycDocumentInclude });
  if (!existing) throw new HttpError(404, "Document KYC introuvable");

  const updated = await prisma.kycDocument.update({
    where: { id },
    data: { status: input.status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.reviewNote },
    include: kycDocumentInclude,
  });

  await createPlatformLog({
    type: "security",
    level: input.status === "rejete" ? "warning" : "info",
    message: `Document KYC "${existing.type}" de ${existing.subject.name} passé au statut "${input.status}"`,
    source: "kycService",
    userId: reviewerId,
  });

  return updated;
}
