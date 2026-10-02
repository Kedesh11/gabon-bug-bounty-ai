import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { pvitReference } from "../services/payments/pvit/identifiers.js";
import { isPvitConfigured } from "../services/payments/pvit/client.js";
import { isDefinitiveRefusal } from "../services/payments/pvit/transaction.js";
import { createCollection } from "../services/payments/paymentService.js";
import { createRecipientAccount, createOnboardingLink } from "../services/payments/stripe/connect.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { listPayments } from "../services/payments/paymentsQueryService.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

// Real transaction ledger for the finance dashboard — same permission that already
// gates seeing that page (dashboard.finance.view doubles as the API read-gate here,
// same precedent as logs.view/support.tickets.view elsewhere in this codebase).
paymentsRouter.get(
  "/",
  requirePermission("dashboard.finance.view"),
  asyncHandler(async (_req, res) => {
    const payments = await listPayments();
    res.json({ payments });
  }),
);

const fundSchema = z.object({
  method: z.enum(["card", "mobile_money"]),
  amount: z.number().int().positive(),
  currency: z.enum(["USD", "EUR", "XAF"]).default("XAF"),
  // Mobile money (PVit) is approved by a PIN prompt on the paying wallet, so it needs to know
  // whose wallet that is — there is no hosted page to send the customer to.
  phoneNumber: z.string().optional(),
  operator: z.enum(["airtel", "moov"]).optional(),
});

paymentsRouter.post(
  "/programmes/:id/fund",
  requirePermission("payments.fund"),
  asyncHandler(async (req, res) => {
    const programme = await prisma.programme.findUnique({
      where: { id: req.params.id },
      include: { entreprise: { include: { profile: true } } },
    });
    if (!programme) throw new HttpError(404, "Programme introuvable");

    if (req.user!.role === "entreprise") {
      const owned = await prisma.entrepriseProfile.findUnique({ where: { profileId: req.user!.id } });
      if (!owned || owned.id !== programme.entrepriseId) {
        throw new HttpError(403, "Ce programme n'appartient pas à votre entreprise");
      }
    }

    const body = fundSchema.parse(req.body);

    const provider = body.method === "card" ? "stripe" : env.MOBILE_MONEY_PROVIDER;
    if (provider === "pvit") {
      if (body.currency !== "XAF") throw new HttpError(400, "Le mobile money ne gère que le XAF");
      if (!body.phoneNumber || !body.operator) {
        throw new HttpError(400, "Le numéro de téléphone et l'opérateur (Airtel Money ou Moov Money) sont requis pour un paiement mobile money");
      }
      if (!isPvitConfigured()) throw new HttpError(503, "Le paiement mobile money n'est pas encore configuré sur cette plateforme");
    }

    const payment = await prisma.payment.create({
      data: {
        programmeId: programme.id,
        entrepriseId: programme.entrepriseId,
        provider,
        amount: body.amount,
        currency: body.currency,
        providerRef: "pending",
      },
    });

    // PVit echoes OUR reference back on its callback, and it is derived from the payment id, so
    // it is recorded before the call: a callback that arrives after a timeout can still find us.
    if (provider === "pvit") {
      await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: pvitReference("C", payment.id) } });
    }

    try {
      const collection = await createCollection(body.method, {
        paymentId: payment.id,
        amount: body.amount,
        currency: body.currency,
        description: `Financement du programme ${programme.name}`,
        customerEmail: req.user!.email,
        customerName: programme.entreprise.profile.name,
        successUrl: `${env.CORS_ORIGIN}/entreprise/programmes/${programme.id}?financement=succes`,
        cancelUrl: `${env.CORS_ORIGIN}/entreprise/programmes/${programme.id}?financement=annule`,
        customerPhone: body.phoneNumber,
        customerOperator: body.operator,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: collection.providerRef, providerTxId: collection.providerTxId ?? null },
      });

      await createPlatformLog({
        type: "system",
        level: "info",
        message: `Financement de ${body.amount} ${body.currency} initié pour le programme "${programme.name}"`,
        source: "payments.routes",
        userId: req.user!.id,
      });

      res.status(201).json({
        payment: { ...payment, provider: collection.provider, providerRef: collection.providerRef },
        redirectUrl: collection.redirectUrl,
        // PVit: no page to redirect to — the customer confirms on their phone, the final status
        // follows by callback.
        ...(collection.redirectUrl === null ? { awaitingPhoneConfirmation: true } : {}),
      });
    } catch (err) {
      // A PVit request that may have reached the customer's phone (timeout, 5xx) must NOT be
      // marked failed: the customer could still approve it, and the late callback would then
      // find a settled payment and the money would never be credited. Left pending, the
      // callback or the reconciliation job settles it. Only an explicit refusal is a failure.
      const indeterminate = provider === "pvit" && !isDefinitiveRefusal(err);
      if (!indeterminate) await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
      await createPlatformLog({
        type: "system",
        level: "error",
        message: `Échec du financement du programme "${programme.name}": ${err instanceof Error ? err.message : String(err)}`,
        source: "payments.routes",
        userId: req.user!.id,
      });
      throw err;
    }
  }),
);

paymentsRouter.post(
  "/onboarding/stripe",
  requirePermission("payments.onboarding.self"),
  asyncHandler(async (req, res) => {
    const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: req.user!.id } });
    if (!hacker) throw new HttpError(403, "Aucun profil hacker associé à ce compte");

    let accountId = hacker.stripeAccountId;
    if (!accountId) {
      accountId = await createRecipientAccount(req.user!.email, hacker.id);
      await prisma.hackerProfile.update({ where: { id: hacker.id }, data: { stripeAccountId: accountId } });
    }

    const url = await createOnboardingLink(
      accountId,
      `${env.CORS_ORIGIN}/hacker/parametres?onboarding=succes`,
      `${env.CORS_ORIGIN}/hacker/parametres?onboarding=refresh`,
    );

    res.json({ url });
  }),
);
