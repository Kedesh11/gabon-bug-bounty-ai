import { Router, raw, urlencoded } from "express";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { stripe } from "../services/payments/stripe/client.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { toStripeAmount } from "../services/payments/stripe/collection.js";
import { checkCinetpayTransactionStatus } from "../services/payments/cinetpay/collection.js";

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

    const status = await checkCinetpayTransactionStatus(transactionId);
    if (status !== "pending") {
      await prisma.payment.updateMany({ where: { id: transactionId, status: "pending" }, data: { status } });
    }

    res.status(200).send("OK");
  }),
);
