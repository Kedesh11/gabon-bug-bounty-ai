import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { isRecipientTransfersActive } from "../services/payments/stripe/connect.js";
import { createPayout } from "../services/payments/paymentService.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { listPayouts } from "../services/payments/paymentsQueryService.js";

export const payoutsRouter = Router();
payoutsRouter.use(requireAuth);

payoutsRouter.get(
  "/",
  requirePermission("dashboard.finance.view"),
  asyncHandler(async (_req, res) => {
    const payouts = await listPayouts();
    res.json({ payouts });
  }),
);

// A Stripe-Connect account that exists but hasn't finished onboarding can't receive
// transfers — treating "has an account id" as "can be paid via Stripe" is what used to
// make such payouts fail (and, with the unique Payout.reportId, stay failed forever).
async function stripeTransfersReady(stripeAccountId: string | null): Promise<boolean> {
  if (!stripeAccountId) return false;
  return isRecipientTransfersActive(stripeAccountId);
}

payoutsRouter.post(
  "/reports/:id",
  requirePermission("payouts.create"),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        hacker: { include: { paymentConfig: true, profile: true } },
        programme: { select: { rewardCurrency: true } },
        payout: true,
      },
    });
    if (!report) throw new HttpError(404, "Rapport introuvable");
    if (report.status !== "accepte") throw new HttpError(400, "Le rapport doit être accepté avant tout versement");
    if (report.reward <= 0) throw new HttpError(400, "Aucune récompense définie sur ce rapport");
    if (report.payout?.status === "succeeded") throw new HttpError(409, "Un versement a déjà été effectué pour ce rapport");
    if (report.payout?.status === "pending") throw new HttpError(409, "Un versement est déjà en cours pour ce rapport");

    const config = report.hacker.paymentConfig;
    const usesMobileMoney = Boolean(config?.gainsEnabled && config.paymentMethods.includes("mobile_money") && config.phoneNumber);
    const stripeAccountId = (await stripeTransfersReady(report.hacker.stripeAccountId)) ? report.hacker.stripeAccountId : null;

    // Decided *before* any Payout row exists: a hacker nobody can pay yet is a
    // precondition error the caller can fix (and retry), not a failed transaction.
    if (!stripeAccountId && !usesMobileMoney) {
      const reason = report.hacker.stripeAccountId
        ? "son compte Stripe Connect n'a pas terminé l'onboarding et aucun mobile money n'est configuré"
        : "ni compte Stripe Connect, ni mobile money configuré";
      throw new HttpError(422, `${report.hacker.profile.name} ne peut pas encore être payé : ${reason}`);
    }

    // Rewards are denominated in the programme's currency (RewardCurrency: USD/EUR/XAF) —
    // paying them out as a hardcoded XAF would turn a 500 USD reward into 500 XAF.
    // CinetPay mobile money is XAF-only, so it can't settle a USD/EUR reward.
    const currency = report.programme.rewardCurrency;
    if (!stripeAccountId && currency !== "XAF") {
      throw new HttpError(
        422,
        `La récompense est en ${currency} : seul un compte Stripe Connect actif peut la recevoir (le mobile money ne gère que le XAF)`,
      );
    }

    const provider = stripeAccountId ? "stripe" : "cinetpay";

    // A previous attempt that failed is retried on the SAME row (and so the same Stripe
    // idempotency key): if that attempt actually moved money before failing to record it,
    // Stripe returns the original transfer instead of paying twice. The conditional
    // updateMany claims the retry atomically — two concurrent retries can't both win.
    let payoutId: string;
    if (report.payout) {
      const claimed = await prisma.payout.updateMany({
        where: { id: report.payout.id, status: "failed" },
        data: { status: "pending", provider, amount: report.reward, currency },
      });
      if (claimed.count === 0) throw new HttpError(409, "Un versement est déjà en cours pour ce rapport");
      payoutId = report.payout.id;
    } else {
      try {
        const created = await prisma.payout.create({
          data: { reportId: report.id, hackerId: report.hackerId, provider, amount: report.reward, currency },
        });
        payoutId = created.id;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new HttpError(409, "Un versement est déjà en cours pour ce rapport");
        }
        throw err;
      }
    }

    try {
      const result = await createPayout(payoutId, report.reward, currency, {
        hackerName: report.hacker.profile.name,
        stripeAccountId,
        mobileMoneyPhoneNumber: usesMobileMoney ? (config!.phoneNumber as string) : null,
        mobileMoneyProvider: usesMobileMoney ? (config!.mobileMoneyProvider as string) : null,
      });

      const updated = await prisma.payout.update({
        where: { id: payoutId },
        data: { status: "succeeded", provider: result.provider, providerRef: result.providerRef },
      });

      await createPlatformLog({
        type: "system",
        level: "info",
        message: `Versement de ${report.reward} ${currency} effectué pour le rapport "${report.title}"`,
        source: "payouts.routes",
        userId: req.user!.id,
      });

      res.status(201).json({ payout: updated });
    } catch (err) {
      await prisma.payout.update({ where: { id: payoutId }, data: { status: "failed" } });
      await createPlatformLog({
        type: "system",
        level: "error",
        message: `Échec du versement pour le rapport "${report.title}": ${err instanceof Error ? err.message : String(err)}`,
        source: "payouts.routes",
        userId: req.user!.id,
      });
      throw err;
    }
  }),
);
