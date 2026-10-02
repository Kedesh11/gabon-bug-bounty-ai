import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// What a programme can still pay out: payments really received for it, minus rewards already
// paid or being paid. Counted per currency, never converted — a programme funded in EUR says
// nothing about its USD rewards. Failed payouts hold nothing back (no money left).
export async function getProgrammeBalance(db: Db, programmeId: string, currency: string) {
  const [funded, committed] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { programmeId, currency, status: "succeeded" } }),
    db.payout.aggregate({
      _sum: { amount: true },
      where: { report: { programmeId }, currency, status: { in: ["pending", "succeeded"] } },
    }),
  ]);
  const fundedAmount = funded._sum.amount ?? 0;
  const committedAmount = committed._sum.amount ?? 0;
  return { funded: fundedAmount, committed: committedAmount, available: fundedAmount - committedAmount };
}
