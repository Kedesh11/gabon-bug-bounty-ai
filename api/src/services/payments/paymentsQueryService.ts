import { prisma } from "../../prisma.js";

// Real transaction visibility for the finance dashboard — money in (Payment, from
// entreprises funding programmes) and money out (Payout, to hackers for accepted
// reports). Finance doesn't allocate a budget on this platform (entreprises fund
// their own programmes directly) — these two lists are the actual ledger.

export async function listPayments() {
  return prisma.payment.findMany({
    include: {
      programme: { select: { id: true, name: true } },
      entreprise: { select: { profile: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPayouts() {
  return prisma.payout.findMany({
    include: {
      report: { select: { id: true, title: true, programmeId: true, programme: { select: { id: true, name: true } } } },
      hacker: { select: { profile: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
