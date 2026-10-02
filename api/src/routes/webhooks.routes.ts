import { Router, raw, urlencoded } from "express";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { stripe } from "../services/payments/stripe/client.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { toStripeAmount } from "../services/payments/stripe/collection.js";
import { checkCinetpayTransactionStatus } from "../services/payments/cinetpay/collection.js";
import { syncPvitPayment, syncPvitPayout } from "../services/payments/pvit/sync.js";
import { syncCinetpayPayout } from "../services/payments/cinetpay/payoutSync.js";

// Mounted BEFORE the global express.json() parser in index.ts: Stripe's signature
// verification (stripe.webhooks.constructEvent) needs the exact raw request body.
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  "/stripe",
  raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
      res.status(400).send("Webhook not configured");
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      res.status(400).send(`Signature invalide: ${err instanceof Error ? err.message : "erreur inconnue"}`);
      return;
    }

    // Only ever moves a Payment out of "pending" (never overwrites a settled one), and only
    // when the session really belongs to this Payment (providerRef = Checkout Session id).
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const paymentId = session.client_reference_id ?? session.metadata?.paymentId;
      if (paymentId && session.payment_status === "paid") {
        const payment = await prisma.payment.findFirst({ where: { id: paymentId, providerRef: session.id } });
        if (payment && payment.status === "pending") {
          // A real Checkout Session for a different amount than the one we recorded must
          // never mark the funding as received — flag it for a human instead.
          const expected = toStripeAmount(payment.amount, payment.currency);
          if (session.amount_total === expected && session.currency === payment.currency.toLowerCase()) {
            await prisma.payment.updateMany({ where: { id: payment.id, status: "pending" }, data: { status: "succeeded" } });
          } else {
            await createPlatformLog({
              type: "security",
              level: "error",
              message: `Paiement ${payment.id} : montant Stripe (${session.amount_total} ${session.currency}) différent du montant attendu (${expected} ${payment.currency}) — non marqué comme reçu`,
              source: "webhooks.routes",
            });
          }
        }
      }
    }

    // Abandoned or failed Checkout Sessions used to stay "pending" forever.
    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const paymentId = session.client_reference_id ?? session.metadata?.paymentId;
      if (paymentId) {
        await prisma.payment.updateMany({
          where: { id: paymentId, providerRef: session.id, status: "pending" },
          data: { status: "failed" },
        });
      }
    }

    res.json({ received: true });
  }),
);

// CinetPay notifications aren't independently verifiable — always re-check the
// authoritative status via the Checkout API before trusting anything (see
// services/payments/cinetpay/collection.ts).
export const cinetpayWebhookRouter = Router();

cinetpayWebhookRouter.post(
  "/cinetpay",
  urlencoded({ extended: true }),
  asyncHandler(async (req, res) => {
    const transactionId = req.body?.cpm_trans_id as string | undefined;
    if (!transactionId) {
      res.status(400).send("cpm_trans_id manquant");
      return;
    }

    const verified = await checkCinetpayTransactionStatus(transactionId);
    if (verified.status === "pending") {
      res.status(200).send("OK");
      return;
    }

    // Money received for a different amount/currency than the one we recorded must never
    // mark the funding as paid — same rule as the Stripe webhook.
    const payment = await prisma.payment.findUnique({ where: { id: transactionId } });
    if (payment && payment.status === "pending") {
      const mismatch =
        verified.status === "succeeded" &&
        ((verified.amount !== null && verified.amount !== payment.amount) ||
          (verified.currency !== null && verified.currency.toUpperCase() !== payment.currency.toUpperCase()));
      if (mismatch) {
        await createPlatformLog({
          type: "security",
          level: "error",
          message: `Paiement ${payment.id} : montant CinetPay (${verified.amount} ${verified.currency}) différent du montant attendu (${payment.amount} ${payment.currency}) — non marqué comme reçu`,
          source: "webhooks.routes",
        });
      } else {
        await prisma.payment.updateMany({ where: { id: payment.id, status: "pending" }, data: { status: verified.status } });
      }
    }

    res.status(200).send("OK");
  }),
);

// CinetPay calls this when a mobile-money TRANSFER (a hacker payout) settles. The form body
// has no signature, so it is used only to find the payout: the real status is then fetched
// from CinetPay's own check endpoint (see payoutSync.ts). Always answers 200 for a well-formed
// call — a transient failure to reach CinetPay is retried by the reconciliation job anyway.
cinetpayWebhookRouter.post(
  "/cinetpay-transfer",
  urlencoded({ extended: true }),
  asyncHandler(async (req, res) => {
    const clientTxId = req.body?.client_transaction_id as string | undefined;
    // Payout ids are UUIDs; a retry's id is "<uuid>-<attempt>".
    const payoutId = clientTxId?.match(/^[0-9a-f-]{36}/i)?.[0];
    if (!payoutId) {
      res.status(400).send("client_transaction_id manquant ou invalide");
      return;
    }

    try {
      await syncCinetpayPayout(payoutId);
    } catch (err) {
      console.error(`[cinetpay] transfer notification for payout ${payoutId} could not be verified:`, err);
    }
    res.status(200).send("OK");
  }),
);

// PVit calls this when a transaction reaches its final state. PVit documents two requirements:
//  - the reply must be HTTP 200 with a JSON echo of the received `transactionId` and `code`,
//    taken from the payload (never hardcoded), or PVit flags a "Notification Failure";
//  - there is no signature on the body, so it is NOT believed: it only says which payment or
//    payout to look at, whose real state is then fetched from PVit's status API (services/
//    payments/pvit/sync.ts), which also checks it is the same transaction, same reference.
// Optionally restricted to PVit's published source IPs (PVIT_CALLBACK_IP_ALLOWLIST).
export const pvitWebhookRouter = Router();

interface PvitCallbackPayload {
  transactionId?: string;
  merchantReferenceId?: string;
  code?: number | string;
  transactionOperation?: string;
}

pvitWebhookRouter.post(
  "/pvit",
  asyncHandler(async (req, res) => {
    const allowlist = env.PVIT_CALLBACK_IP_ALLOWLIST.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (allowlist.length > 0 && !allowlist.includes(req.ip ?? "")) {
      res.status(403).json({ error: "Source non autorisée" });
      return;
    }

    const payload = (req.body ?? {}) as PvitCallbackPayload;
    const { transactionId, merchantReferenceId } = payload;
    if (typeof transactionId !== "string" || typeof merchantReferenceId !== "string") {
      res.status(400).json({ error: "transactionId et merchantReferenceId requis" });
      return;
    }

    try {
      if (payload.transactionOperation === "GIVE_CHANGE") {
        const payout = await prisma.payout.findFirst({ where: { provider: "pvit", providerRef: merchantReferenceId } });
        if (payout) await syncPvitPayout(payout.id, transactionId);
      } else {
        const payment = await prisma.payment.findFirst({ where: { provider: "pvit", providerRef: merchantReferenceId } });
        if (payment) await syncPvitPayment(payment.id, transactionId);
      }
    } catch (err) {
      // Still acknowledged: PVit delivered it, and the reconciliation job re-checks what stays pending.
      console.error(`[pvit] callback for ${merchantReferenceId} could not be verified:`, err);
    }

    res.status(200).json({ transactionId, responseCode: payload.code });
  }),
);
