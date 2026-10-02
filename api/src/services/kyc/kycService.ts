import type { KycDocumentStatus, KycDocumentType } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { uploadKycFile, getSignedKycUrl } from "./kycStorage.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

const kycDocumentInclude = {
  subject: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

// The storage path is internal (private bucket); clients only learn whether a file exists
// and fetch it through the signed-URL endpoint.
function serialize<T extends { filePath: string | null }>(doc: T) {
  const { filePath, ...rest } = doc;
  return { ...rest, hasFile: filePath !== null };
}

export interface ListKycDocumentsFilters {
  subjectId?: string;
  status?: KycDocumentStatus;
}

export async function listKycDocuments(filters: ListKycDocumentsFilters = {}) {
  const docs = await prisma.kycDocument.findMany({
    where: { subjectId: filters.subjectId, status: filters.status },
    include: kycDocumentInclude,
    orderBy: { createdAt: "desc" },
  });
  return docs.map(serialize);
}

export interface SubmitKycDocumentInput {
  type: KycDocumentType;
  fileName?: string;
  filePath?: string;
}

// Self-service: a hacker/entreprise submits their own document. Re-submitting the
// same type replaces the previous row (upsert on the [subjectId, type] pair) rather
// than piling up duplicates — matches how a real "upload my passport" flow behaves:
// only the latest submission per document type matters for review.
export async function submitKycDocument(subjectId: string, input: SubmitKycDocumentInput) {
  const existing = await prisma.kycDocument.findFirst({ where: { subjectId, type: input.type } });
  if (existing) {
    return serialize(await prisma.kycDocument.update({
      where: { id: existing.id },
      data: { fileName: input.fileName, filePath: input.filePath, status: "en_attente", reviewedById: null, reviewedAt: null, reviewNote: null },
      include: kycDocumentInclude,
    }));
  }
  return serialize(await prisma.kycDocument.create({
    data: { subjectId, type: input.type, fileName: input.fileName, filePath: input.filePath },
    include: kycDocumentInclude,
  }));
}

// Self-service upload: the real file goes to the private bucket, then the row is created or
// replaced exactly like a metadata-only submission (status back to en_attente).
export async function submitKycFile(
  subjectId: string,
  type: KycDocumentType,
  file: { buffer: Buffer; originalname: string; mimetype: string },
) {
  const { path } = await uploadKycFile(subjectId, type, file);
  return submitKycDocument(subjectId, { type, fileName: file.originalname, filePath: path });
}

// Staff (kyc.review / users.view) or the document's own subject only.
export async function getKycFileUrl(id: string, user: { id: string; permissions: string[] }) {
  const doc = await prisma.kycDocument.findUnique({ where: { id } });
  if (!doc) throw new HttpError(404, "Document KYC introuvable");

  const isStaff = user.permissions.includes("kyc.review") || user.permissions.includes("users.view");
  if (!isStaff && doc.subjectId !== user.id) throw new HttpError(403, "Accès refusé à ce document");
  if (!doc.filePath) throw new HttpError(404, "Aucun fichier n'a été envoyé pour ce document");

  return getSignedKycUrl(doc.filePath);
}

export interface ReviewKycDocumentInput {
  status: Extract<KycDocumentStatus, "valide" | "rejete">;
  reviewNote?: string;
}

export async function reviewKycDocument(id: string, reviewerId: string, input: ReviewKycDocumentInput) {
  const existing = await prisma.kycDocument.findUnique({ where: { id }, include: kycDocumentInclude });
  if (!existing) throw new HttpError(404, "Document KYC introuvable");
  // Nothing to look at, nothing to approve: "valide" on a document with no stored file would
  // be a verification that never happened. Rejecting stays possible (asks for a real upload).
  if (input.status === "valide" && !existing.filePath) {
    throw new HttpError(409, "Impossible de valider un document dont aucun fichier n'a été envoyé");
  }

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

  return serialize(updated);
}
