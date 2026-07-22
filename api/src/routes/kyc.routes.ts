import { Router } from "express";
import { z } from "zod";
import { KycDocumentStatus, KycDocumentType } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { listKycDocuments, submitKycDocument, reviewKycDocument } from "../services/kyc/kycService.js";

export const kycRouter = Router();
kycRouter.use(requireAuth);

// Staff-only list, reusing the existing users.view permission that already gates
// the /admin/utilisateurs page these documents are reviewed from. Supports an
// optional status filter (e.g. ?status=en_attente for a "pending" badge/list) and
// an optional subjectId filter (a single user's documents, e.g. AdminUserDetail).
const listQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
  status: z.nativeEnum(KycDocumentStatus).optional(),
});

kycRouter.get(
  "/documents",
  requirePermission("users.view"),
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const documents = await listKycDocuments(query);
    res.json({ documents });
  }),
);

// Self-service: a hacker/entreprise submits their own document.
const submitSchema = z.object({
  type: z.nativeEnum(KycDocumentType),
  fileName: z.string().optional(),
});

kycRouter.get(
  "/documents/mine",
  asyncHandler(async (req, res) => {
    const documents = await listKycDocuments({ subjectId: req.user!.id });
    res.json({ documents });
  }),
);

kycRouter.post(
  "/documents",
  asyncHandler(async (req, res) => {
    const body = submitSchema.parse(req.body);
    const document = await submitKycDocument(req.user!.id, body);
    res.status(201).json({ document });
  }),
);

const reviewSchema = z.object({
  status: z.enum(["valide", "rejete"]),
  reviewNote: z.string().optional(),
});

kycRouter.patch(
  "/documents/:id",
  requirePermission("kyc.review"),
  asyncHandler(async (req, res) => {
    const body = reviewSchema.parse(req.body);
    const document = await reviewKycDocument(req.params.id, req.user!.id, body);
    res.json({ document });
  }),
);
