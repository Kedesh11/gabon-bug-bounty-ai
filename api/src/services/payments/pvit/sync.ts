import { prisma } from "../../../prisma.js";
import { createPlatformLog } from "../../platformLogs/logsService.js";
import { getPvitTransactionStatus } from "./status.js";

const RECONCILE_MIN_AGE_MS = 3 * 60 * 1000; // PVit's own guidance: wait ~3 minutes for a callback
const STUCK_PAYOUT_ALERT_MS = 15 * 60 * 1000;

type SyncResult = "succeeded" | "failed" | "pending" | "unchanged";

// Settles ONE pending PVit collection from PVit's own status API. The callback body has no
// signature, so it is only ever used to say *which* transaction to look at (`transactionIdHint`);
// what is believed is PVit's answer — and only if that answer is about THIS payment (same merchant
// reference, same operation account) and for the amount we asked for.
export async function syncPvitPayment(paymentId: string, transactionIdHint?: string): Promise<SyncResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "pvit" || payment.status !== "pending") return "unchanged";

  const transactionId = payment.providerTxId ?? transactionIdHint;
  if (!transactionId) return "pending"; // PVit never acknowledged it: nothing to ask about

  const status = await getPvitTransactionStatus(transactionId, "PAYMENT");
  if (!status) return "pending";
  if (status.merchantReference && status.merchantReference !== payment.providerRef) {
    await createPlatformLog({
      type: "security",
      level: "error",
      message: `Callback PVit incohérent : la transaction ${transactionId} ne correspond pas au paiement ${payment.id} (référence ${status.merchantReference})`,
      source: "pvit.sync",
    });
    return "unchanged";
  }

  if (!payment.providerTxId) await prisma.payment.update({ where: { id: payment.id }, data: { providerTxId: transactionId } });
  if (status.outcome === "pending") return "pending";

  if (status.outcome === "succeeded" && status.amount !== null && status.amount !== payment.amount) {
    await createPlatformLog({
      type: "security",
      level: "error",
      message: `Paiement ${payment.id} : montant PVit (${status.amount} XAF) différent du montant attendu (${payment.amount} XAF) — non marqué comme reçu`,
      source: "pvit.sync",
    });
    return "unchanged";
  }

  const moved = await prisma.payment.updateMany({ where: { id: payment.id, status: "pending" }, data: { status: status.outcome } });
  return moved.count === 1 ? status.outcome : "unchanged";
}

// Same for a payout (GIVE_CHANGE). Normally already final in the synchronous response; this
// settles the ones PVit answered PENDING/AMBIGUOUS for. A payout with no PVit transaction id
// (the request's outcome is unknown) can't be asked about and is left for a human — see
// POST /api/payouts/:id/resolve.
export async function syncPvitPayout(payoutId: string, transactionIdHint?: string): Promise<SyncResult> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId }, include: { report: { select: { title: true } } } });
  if (!payout || payout.provider !== "pvit" || payout.status !== "pending") return "unchanged";

  const transactionId = payout.providerTxId ?? transactionIdHint;
  if (!transactionId) return "pending";

  const status = await getPvitTransactionStatus(transactionId, "GIVE_CHANGE");
  if (!status) return "pending";
  if (status.merchantReference && status.merchantReference !== payout.providerRef) {
    await createPlatformLog({
      type: "security",
      level: "error",
      message: `Callback PVit incohérent : la transaction ${transactionId} ne correspond pas au versement ${payout.id} (référence ${status.merchantReference})`,
      source: "pvit.sync",
    });
    return "unchanged";
  }

  if (!payout.providerTxId) await prisma.payout.update({ where: { id: payout.id }, data: { providerTxId: transactionId } });
  if (status.outcome === "pending") return "pending";

  const moved = await prisma.payout.updateMany({ where: { id: payout.id, status: "pending" }, data: { status: status.outcome } });
  if (moved.count === 0) return "unchanged";

  await createPlatformLog({
    type: "system",
    level: status.outcome === "failed" ? "error" : "info",
    message:
      status.outcome === "succeeded"
        ? `Versement mobile money confirmé par PVit pour le rapport "${payout.report.title}"`
        : `Versement mobile money refusé par PVit pour le rapport "${payout.report.title}" — il peut être relancé`,
    source: "pvit.sync",
  });
  return status.outcome;
}

// Safety net for callbacks that never arrive: re-checks every PVit collection/payout still
// pending after a few minutes, and raises an alert (once it is old enough to be worrying) for
// payouts whose outcome is unknown AND can't be queried.
export async function reconcilePendingPvit(): Promise<number> {
  const cutoff = new Date(Date.now() - RECONCILE_MIN_AGE_MS);
  const [payments, payouts] = await Promise.all([
    prisma.payment.findMany({ where: { provider: "pvit", status: "pending", providerTxId: { not: null }, updatedAt: { lt: cutoff } }, select: { id: true }, take: 100 }),
    prisma.payout.findMany({ where: { provider: "pvit", status: "pending", providerTxId: { not: null }, updatedAt: { lt: cutoff } }, select: { id: true }, take: 100 }),
  ]);

  let settled = 0;
  for (const { id } of payments) {
    try {
      const result = await syncPvitPayment(id);
      if (result === "succeeded" || result === "failed") settled += 1;
    } catch (err) {
      console.error(`[pvit] reconciliation failed for payment ${id}:`, err);
    }
  }
  for (const { id } of payouts) {
    try {
      const result = await syncPvitPayout(id);
      if (result === "succeeded" || result === "failed") settled += 1;
    } catch (err) {
      console.error(`[pvit] reconciliation failed for payout ${id}:`, err);
    }
  }

  const stuck = await prisma.payout.findMany({
    where: { provider: "pvit", status: "pending", providerTxId: null, updatedAt: { lt: new Date(Date.now() - STUCK_PAYOUT_ALERT_MS), gt: new Date(Date.now() - STUCK_PAYOUT_ALERT_MS - 5 * 60 * 1000) } },
    select: { id: true, report: { select: { title: true } } },
  });
  for (const payout of stuck) {
    await createPlatformLog({
      type: "system",
      level: "error",
      message: `Versement PVit ${payout.id} (rapport "${payout.report.title}") : issue inconnue, à vérifier dans le tableau de bord PVit puis à trancher via POST /api/payouts/${payout.id}/resolve`,
      source: "pvit.sync",
    });
  }
  return settled;
}
