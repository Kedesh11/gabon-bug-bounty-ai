import type { CardBrand, CryptoType, HackerStatus, MobileMoneyProvider, PaymentMethod, PreferredCurrency } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const hackerDetailInclude = { profile: true, badges: true };

// Standard competition ranking: ties share a rank, and the rank right after a tie
// skips accordingly (1, 2, 2, 4 — not 1, 2, 2, 3). Input must already be sorted by
// reputation desc. Always computed, never stored, so it can't drift out of sync with
// reputation or be hand-edited into an inconsistent value.
function computeRanks<T extends { reputation: number }>(hackersSortedByReputationDesc: T[]): (T & { rank: number })[] {
  let rank = 0;
  let previousReputation: number | null = null;
  return hackersSortedByReputationDesc.map((hacker, index) => {
    if (previousReputation === null || hacker.reputation !== previousReputation) {
      rank = index + 1;
      previousReputation = hacker.reputation;
    }
    return { ...hacker, rank };
  });
}

export async function getOwnHackerProfile(userId: string) {
  const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: userId } });
  if (!hacker) throw new HttpError(403, "Aucun profil hacker associé à ce compte");
  return hacker;
}

export async function getOwnPaymentConfig(userId: string) {
  const hacker = await getOwnHackerProfile(userId);
  return prisma.hackerPaymentConfig.findUnique({ where: { hackerId: hacker.id } });
}

// Note: only the card's last 4 digits are ever accepted/stored here — the CVV has no
// column in the schema at all (PCI: never persist it), and the full PAN is never sent to us.
export interface UpdatePaymentConfigInput {
  gainsEnabled?: boolean;
  paymentMethods?: PaymentMethod[];
  mobileMoneyProvider?: MobileMoneyProvider;
  phoneNumber?: string;
  accountName?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  bankCountry?: string;
  cardBrand?: CardBrand;
  cardHolderName?: string;
  cardNumberLast4?: string;
  cardExpiry?: string;
  cardBillingCountry?: string;
  paypalEmail?: string;
  cryptoType?: CryptoType;
  walletAddress?: string;
  preferredCurrency?: PreferredCurrency;
  autoWithdrawal?: boolean;
  minimumPayoutThreshold?: string;
}

export async function updateOwnPaymentConfig(userId: string, input: UpdatePaymentConfigInput) {
  const hacker = await getOwnHackerProfile(userId);
  return prisma.hackerPaymentConfig.upsert({
    where: { hackerId: hacker.id },
    update: input,
    create: { hackerId: hacker.id, ...input },
  });
}

// Self-service subset of updateHacker below — a hacker can edit their own
// specialties, but reputation/bugsFound/totalRewards/status stay admin-only
// (they're computed/trust signals, not something the hacker should set themselves).
export async function updateOwnHacker(
  userId: string,
  input: { specialties?: string[]; bio?: string; githubHandle?: string; twitterHandle?: string },
) {
  const hacker = await getOwnHackerProfile(userId);
  return prisma.hackerProfile.update({ where: { id: hacker.id }, data: input, include: hackerDetailInclude });
}

const TOP_RESEARCHERS_LIMIT = 5;

// Real "Top Chercheurs" for an entreprise's dashboard — grouped directly off
// Report.entrepriseId (denormalized onto Report already, no join through Programme
// needed), counting accepted/resolved reports and summing their rewards.
export async function topResearchersForEntreprise(entrepriseId: string) {
  const grouped = await prisma.report.groupBy({
    by: ["hackerId"],
    where: { entrepriseId, status: { in: ["accepte", "resolu"] } },
    _count: { _all: true },
    _sum: { reward: true },
    orderBy: { _sum: { reward: "desc" } },
    take: TOP_RESEARCHERS_LIMIT,
  });

  const hackers = await prisma.hackerProfile.findMany({
    where: { id: { in: grouped.map((g) => g.hackerId) } },
    include: hackerDetailInclude,
  });
  const hackerById = new Map(hackers.map((h) => [h.id, h]));

  return grouped
    .map((g) => ({
      hacker: hackerById.get(g.hackerId),
      reportsCount: g._count._all,
      totalReward: g._sum.reward ?? 0,
    }))
    .filter((entry): entry is { hacker: NonNullable<typeof entry.hacker>; reportsCount: number; totalReward: number } => !!entry.hacker);
}

export async function listHackers() {
  const hackers = await prisma.hackerProfile.findMany({ include: hackerDetailInclude, orderBy: { reputation: "desc" } });
  return computeRanks(hackers);
}

export async function getHackerById(id: string) {
  const hacker = await prisma.hackerProfile.findUnique({ where: { id }, include: hackerDetailInclude });
  if (!hacker) throw new HttpError(404, "Hacker introuvable");

  // Rank depends on where this hacker falls among ALL hackers by reputation, not just
  // itself — a lightweight second query (id + reputation only) is enough to place it.
  const allByReputation = await prisma.hackerProfile.findMany({
    select: { id: true, reputation: true },
    orderBy: { reputation: "desc" },
  });
  const ranked = computeRanks(allByReputation);
  const rank = ranked.find((h) => h.id === id)?.rank ?? ranked.length;

  return { ...hacker, rank };
}

// Public leaderboard (no auth required, see hackers.routes.ts): deliberately a
// minimal, PII-free projection — no email, unlike listHackers()/getHackerById()
// above which staff use and which include the full profile relation.
export async function listHackerLeaderboard() {
  const hackers = await prisma.hackerProfile.findMany({
    where: { status: "actif" },
    select: {
      id: true,
      reputation: true,
      bugsFound: true,
      totalRewards: true,
      joinedAt: true,
      badges: { select: { name: true, icon: true, description: true } },
      profile: { select: { name: true, avatar: true } },
    },
    orderBy: { reputation: "desc" },
  });

  const criticalCounts = await prisma.report.groupBy({
    by: ["hackerId"],
    where: { severity: "critique", status: { in: ["accepte", "resolu"] } },
    _count: { _all: true },
  });
  const criticalByHackerId = new Map(criticalCounts.map((c) => [c.hackerId, c._count._all]));

  return computeRanks(hackers).map((hacker) => ({
    ...hacker,
    criticalBugsCount: criticalByHackerId.get(hacker.id) ?? 0,
  }));
}

export interface UpdateHackerInput {
  reputation?: number;
  bugsFound?: number;
  totalRewards?: number;
  specialties?: string[];
  status?: HackerStatus;
}

export async function updateHacker(id: string, input: UpdateHackerInput) {
  const existing = await prisma.hackerProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Hacker introuvable");
  return prisma.hackerProfile.update({ where: { id }, data: input, include: hackerDetailInclude });
}

export async function deleteHacker(id: string) {
  const existing = await prisma.hackerProfile.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Hacker introuvable");
  await prisma.hackerProfile.delete({ where: { id } });
}
