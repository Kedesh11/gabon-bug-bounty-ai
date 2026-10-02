import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { syncCinetpayPayout } from "../services/payments/cinetpay/payoutSync.js";
import { checkCinetpayTransferStatus, clientTransactionId } from "../services/payments/cinetpay/transferStatus.js";
import { CINETPAY_TRANSFER_STEP } from "../services/payments/cinetpay/payout.js";
import { isRecipientTransfersActive } from "../services/payments/stripe/connect.js";
import { getProgrammeBalance } from "../services/payments/programmeBalance.js";
import { env } from "../env.js";
import { isPvitConfigured } from "../services/payments/pvit/client.js";
import { isDefinitiveRefusal } from "../services/payments/pvit/transaction.js";
import { pvitReference, toPvitMsisdn, toPvitOperator } from "../services/payments/pvit/identifiers.js";
import { getPvitBalance, getPvitTransactionStatus } from "../services/payments/pvit/status.js";
import { syncPvitPayout } from "../services/payments/pvit/sync.js";
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

    // Whichever aggregator MOBILE_MONEY_PROVIDER names handles the mobile-money case (PVit in Gabon).
    const provider = stripeAccountId ? "stripe" : env.MOBILE_MONEY_PROVIDER;

    // CinetPay rejects a transfer whose amount isn't a multiple of 5 — tell the caller up
    // front instead of creating a payout row that is bound to fail at the provider.
    if (provider === "cinetpay" && report.reward % CINETPAY_TRANSFER_STEP !== 0) {
      throw new HttpError(422, `Le mobile money exige un montant multiple de ${CINETPAY_TRANSFER_STEP} : ${report.reward} ${currency} ne peut pas être envoyé tel quel`);
    }

    // PVit pays Airtel Money and Moov Money wallets from the platform's operation account. Every
    // check that can be made without calling PVit is made here, before a payout row exists.
    if (provider === "pvit") {
      if (!isPvitConfigured()) throw new HttpError(503, "Le paiement mobile money n'est pas encore configuré sur cette plateforme");
      if (!toPvitOperator(config!.mobileMoneyProvider)) {
        throw new HttpError(422, `${report.hacker.profile.name} utilise un opérateur que PVit ne dessert pas (seuls Airtel Money et Moov Money le sont)`);
      }
      if (!toPvitMsisdn(config!.phoneNumber)) {
        throw new HttpError(422, `Le numéro mobile money de ${report.hacker.profile.name} n'est pas un numéro gabonais valide`);
      }
      // GIVE_CHANGE draws on the operation account: with no money in it the payout would only fail.
      const balance = await getPvitBalance();
      if (balance !== null && balance < report.reward) {
        throw new HttpError(409, `Solde du compte PVit insuffisant : ${balance} XAF disponibles, ${report.reward} XAF requis. Approvisionnez le compte avant de verser.`);
      }
    }

    // A failed CinetPay payout may not really have failed: a timeout after CinetPay accepted
    // the order looks the same as a refusal to us. Before sending a fresh transfer, ask CinetPay
    // about the previous attempt so a retry can never pay the hacker twice. If CinetPay can't be
    // reached the retry stops here — better a delayed payout than a double one.
    if (report.payout?.status === "failed" && (report.payout.provider === "cinetpay" || report.payout.provider === "pvit")) {
      let previous: "succeeded" | "failed" | "pending" | "unknown";
      if (report.payout.provider === "cinetpay") {
        previous = await checkCinetpayTransferStatus(clientTransactionId(report.payout.id, report.payout.attempt));
      } else if (report.payout.providerTxId) {
        // A PVit payout is only ever "failed" on an explicit refusal; if PVit nonetheless gave
        // it an id, its answer settles whether that attempt went through.
        previous = (await getPvitTransactionStatus(report.payout.providerTxId, "GIVE_CHANGE"))?.outcome ?? "unknown";
      } else {
        previous = "unknown";
      }
      if (previous === "succeeded" || previous === "pending") {
        const adopted = await prisma.payout.update({ where: { id: report.payout.id }, data: { status: previous } });
        res.status(previous === "succeeded" ? 200 : 202).json({ payout: adopted, adopted: true });
        return;
      }
    }

    // Funding check + claim in ONE transaction, serialised per programme by an advisory lock:
    // without it two simultaneous payouts could each see enough balance and together overspend.
    // The pending row created/claimed here is what the next caller's balance already counts.
    //
    // A previous attempt that failed is retried on the SAME row (and so the same Stripe
    // idempotency key): if that attempt actually moved money before failing to record it,
    // Stripe returns the original transfer instead of paying twice. The conditional
    // updateMany claims the retry atomically — two concurrent retries can't both win.
    let claimed: { id: string; attempt: number };
    try {
      claimed = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${report.programmeId}))`;

        const balance = await getProgrammeBalance(tx, report.programmeId, currency);
        if (balance.available < report.reward) {
          throw new HttpError(
            409,
            `Programme insuffisamment financé : ${balance.available} ${currency} disponibles (${balance.funded} reçus, ${balance.committed} déjà versés ou en cours), ${report.reward} ${currency} requis. L'entreprise doit d'abord financer le programme.`,
          );
        }

        if (report.payout) {
          const reclaimed = await tx.payout.updateMany({
            where: { id: report.payout.id, status: "failed" },
            data: { status: "pending", provider, amount: report.reward, currency, attempt: { increment: 1 } },
          });
          if (reclaimed.count === 0) throw new HttpError(409, "Un versement est déjà en cours pour ce rapport");
          const row = await tx.payout.findUniqueOrThrow({ where: { id: report.payout.id }, select: { id: true, attempt: true } });
          return row;
        }

        return tx.payout.create({
          data: { reportId: report.id, hackerId: report.hackerId, provider, amount: report.reward, currency },
          select: { id: true, attempt: true },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "Un versement est déjà en cours pour ce rapport");
      }
      throw err;
    }

    const payoutId = claimed.id;

    try {
      const result = await createPayout(payoutId, report.reward, currency, {
        hackerName: report.hacker.profile.name,
        stripeAccountId,
        mobileMoneyPhoneNumber: usesMobileMoney ? (config!.phoneNumber as string) : null,
        mobileMoneyProvider: usesMobileMoney ? (config!.mobileMoneyProvider as string) : null,
      }, claimed.attempt);

      const updated = await prisma.payout.update({
        where: { id: payoutId },
        data: { status: result.status, provider: result.provider, providerRef: result.providerRef, providerTxId: result.providerTxId ?? null },
      });

      await createPlatformLog({
        type: "system",
        level: "info",
        message:
          result.status === "succeeded"
            ? `Versement de ${report.reward} ${currency} effectué pour le rapport "${report.title}"`
            : `Versement de ${report.reward} ${currency} envoyé à ${result.provider === "pvit" ? "PVit" : "CinetPay"} pour le rapport "${report.title}", en attente de confirmation`,
        source: "payouts.routes",
        userId: req.user!.id,
      });

      // 201 even when "pending": the transfer was created, its settlement comes later.
      res.status(201).json({ payout: updated });
    } catch (err) {
      // PVit: a request that MAY have been executed (timeout, 5xx) must not become "failed" —
      // that would allow a retry, i.e. a second payment. It stays pending, keyed by the
      // reference PVit would echo back, until a callback, the status API or a human decides.
      if (provider === "pvit" && !isDefinitiveRefusal(err)) {
        const pending = await prisma.payout.update({
          where: { id: payoutId },
          data: { providerRef: pvitReference("P", payoutId, claimed.attempt) },
        });
        await createPlatformLog({
          type: "system",
          level: "error",
          message: `Versement PVit pour le rapport "${report.title}" : issue incertaine (${err instanceof Error ? err.message : String(err)}). Laissé en attente — vérifier dans le tableau de bord PVit avant toute relance.`,
          source: "payouts.routes",
          userId: req.user!.id,
        });
        res.status(202).json({
          payout: pending,
          warning: "L'issue du versement est incertaine : il reste en attente et ne sera pas relancé automatiquement. Vérifiez-le dans PVit.",
        });
        return;
      }
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

// Asks the mobile-money aggregator for the real status of a payout still "pending" — the manual
// counterpart of the notification callback and of the reconciliation job, for when finance
// doesn't want to wait for either.
payoutsRouter.post(
  "/:id/sync",
  requirePermission("payouts.create"),
  asyncHandler(async (req, res) => {
    const payout = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!payout) throw new HttpError(404, "Versement introuvable");
    if (payout.provider === "stripe") throw new HttpError(400, "Seuls les versements mobile money ont un statut à synchroniser");

    const result = payout.provider === "pvit" ? await syncPvitPayout(payout.id) : await syncCinetpayPayout(payout.id);
    const updated = await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    res.json({ payout: updated, result });
  }),
);

const resolveSchema = z.object({ outcome: z.enum(["succeeded", "failed"]), note: z.string().trim().min(5, "Une justification d'au moins 5 caractères est requise") });

// A PVit payout whose request timed out has no PVit transaction id, so nothing can be asked of
// PVit about it. Someone with payouts.create checks the PVit dashboard and records what they
// found. Only for that exact case — a payout PVit can be asked about must go through /sync.
// Marking it "failed" is what re-opens the door to a retry, hence the audit trail.
payoutsRouter.post(
  "/:id/resolve",
  requirePermission("payouts.create"),
  asyncHandler(async (req, res) => {
    const body = resolveSchema.parse(req.body);
    const payout = await prisma.payout.findUnique({ where: { id: req.params.id }, include: { report: { select: { title: true } } } });
    if (!payout) throw new HttpError(404, "Versement introuvable");
    if (payout.provider !== "pvit" || payout.status !== "pending" || payout.providerTxId) {
      throw new HttpError(409, "Seul un versement PVit en attente, sans identifiant de transaction PVit, peut être tranché à la main");
    }

    const moved = await prisma.payout.updateMany({ where: { id: payout.id, status: "pending", providerTxId: null }, data: { status: body.outcome } });
    if (moved.count === 0) throw new HttpError(409, "Ce versement a changé entre-temps");

    await createPlatformLog({
      type: "security",
      level: "warning",
      message: `Versement PVit du rapport "${payout.report.title}" tranché à la main : ${body.outcome} (${body.note})`,
      source: "payouts.routes",
      userId: req.user!.id,
    });
    res.json({ payout: await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } }) });
  }),
);
