import { prisma } from "../../../prisma.js";
import { createPlatformLog } from "../../platformLogs/logsService.js";
import { checkCinetpayTransferStatus, clientTransactionId } from "./transferStatus.js";

const RECONCILE_MIN_AGE_MS = 2 * 60 * 1000;

// Settles ONE pending CinetPay payout from CinetPay's own answer. The notify_url POST only
// tells us *which* payout to look at — its body is never trusted (no signature on it) — and
// this is also what the reconciliation job and the manual "sync" action call, so a lost
// notification can't leave a payout pending forever. Only ever moves a payout out of
// "pending": a settled one is never touched, so late/duplicate callbacks are harmless.
export async function syncCinetpayPayout(payoutId: string): Promise<"succeeded" | "failed" | "pending" | "unchanged"> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId }, include: { report: { select: { title: true } } } });
  if (!payout || payout.provider !== "cinetpay" || payout.status !== "pending") return "unchanged";

  const outcome = await checkCinetpayTransferStatus(clientTransactionId(payout.id, payout.attempt));
  // "unknown" = CinetPay has no record yet; leave it pending, the next run asks again.
  if (outcome === "pending" || outcome === "unknown") return "pending";

  const moved = await prisma.payout.updateMany({ where: { id: payout.id, status: "pending" }, data: { status: outcome } });
  if (moved.count === 0) return "unchanged";

  await createPlatformLog({
    type: "system",
    level: outcome === "failed" ? "error" : "info",
    message:
      outcome === "succeeded"
        ? `Versement mobile money confirmé par CinetPay pour le rapport "${payout.report.title}"`
        : `Versement mobile money rejeté par CinetPay pour le rapport "${payout.report.title}" — il peut être relancé`,
    source: "cinetpay.payoutSync",
  });
  return outcome;
}

// Safety net for notifications that never arrive (our API down at that moment, CinetPay
// retries exhausted): re-checks every CinetPay payout still pending after a couple of minutes.
export async function reconcilePendingCinetpayPayouts(): Promise<number> {
  const stale = await prisma.payout.findMany({
    where: { provider: "cinetpay", status: "pending", updatedAt: { lt: new Date(Date.now() - RECONCILE_MIN_AGE_MS) } },
    select: { id: true },
    take: 100,
  });

  let settled = 0;
  for (const { id } of stale) {
    try {
      const result = await syncCinetpayPayout(id);
      if (result === "succeeded" || result === "failed") settled += 1;
    } catch (err) {
      // One failing check (network, auth) must not stop the others.
      console.error(`[cinetpay] reconciliation failed for payout ${id}:`, err);
    }
  }
  return settled;
}
