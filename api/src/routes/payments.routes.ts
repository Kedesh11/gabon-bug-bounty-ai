import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { createCollection } from "../services/payments/paymentService.js";
import { createRecipientAccount, createOnboardingLink } from "../services/payments/stripe/connect.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

const fundSchema = z.object({
  method: z.enum(["card", "mobile_money"]),
  amount: z.number().int().positive(),
  currency: z.enum(["USD", "EUR", "XAF"]).default("XAF"),
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

    const payment = await prisma.payment.create({
      data: {
        programmeId: programme.id,
        entrepriseId: programme.entrepriseId,
        provider: body.method === "card" ? "stripe" : "cinetpay",
        amount: body.amount,
        currency: body.currency,
        providerRef: "pending",
      },
    });

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
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: collection.providerRef },
      });

      await createPlatformLog({
        type: "system",
        level: "info",
        message: `Financement de ${body.amount} ${body.currency} initié pour le programme "${programme.name}"`,
        source: "payments.routes",
        userId: req.user!.id,
      });

      res.status(201).json({ payment: { ...payment, providerRef: collection.providerRef }, redirectUrl: collection.redirectUrl });
    } catch (err) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
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
