// Pure aggregation functions deriving finance dashboard figures from real data
// already fetched by the dashboards (Payment/Payout/Report lists) — same pattern
// as activityFeed.ts/platformGrowth.ts: no fabricated numbers, no new backend
// aggregation endpoint, just derive from what's already real.
import { Payment, Payout } from "@/hooks/api/payments";
import { Report } from "@/types/domain";

export interface Transaction {
  id: string;
  kind: "payment" | "payout";
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  party: string;
  label: string;
  createdAt: string;
}

const MAX_TRANSACTIONS = 8;

// Money in (Payment, from entreprises) and money out (Payout, to hackers), merged
// into one chronological feed — the real transaction ledger, not a proxy.
export function buildTransactionFeed(payments: Payment[], payouts: Payout[]): Transaction[] {
  const paymentTx: Transaction[] = payments.map((p) => ({
    id: `payment-${p.id}`,
    kind: "payment",
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    party: p.entreprise.profile.name,
    label: p.programme.name,
    createdAt: p.createdAt,
  }));

  const payoutTx: Transaction[] = payouts.map((p) => ({
    id: `payout-${p.id}`,
    kind: "payout",
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    party: p.hacker.profile.name,
    label: p.report.title,
    createdAt: p.createdAt,
  }));

  return [...paymentTx, ...payoutTx]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_TRANSACTIONS);
}

export interface ProgrammeCost {
  programmeId: string;
  programmeName: string;
  total: number;
}

const MAX_TOP_PROGRAMMES = 5;

// "Coût" per programme = real succeeded Payout amounts, grouped by the programme
// the paid report belongs to — not a hardcoded pair of rows.
export function topProgrammesByCost(payouts: Payout[]): ProgrammeCost[] {
  const totals = new Map<string, ProgrammeCost>();
  for (const payout of payouts) {
    if (payout.status !== "succeeded") continue;
    const { programmeId, programme } = payout.report;
    const existing = totals.get(programmeId);
    if (existing) {
      existing.total += payout.amount;
    } else {
      totals.set(programmeId, { programmeId, programmeName: programme.name, total: payout.amount });
    }
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, MAX_TOP_PROGRAMMES);
}

// Reports accepted with a reward but no Payout row yet at all — mirrors the real
// constraint in payouts.routes.ts (a report with any existing payout, even a failed
// one, can't get a new one through that endpoint), so this list matches exactly
// what "En Attente de Versement" can actually still be actioned on.
export function pendingPayoutReports(reports: Report[], payouts: Payout[]): Report[] {
  const reportIdsWithPayout = new Set(payouts.map((p) => p.reportId));
  return reports.filter((r) => r.status === "accepté" && r.reward > 0 && !reportIdsWithPayout.has(r.id));
}
