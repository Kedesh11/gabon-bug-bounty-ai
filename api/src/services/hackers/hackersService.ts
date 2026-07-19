import type { CardBrand, CryptoType, HackerStatus, MobileMoneyProvider, PaymentMethod, PreferredCurrency } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const hackerDetailInclude = { profile: true, badges: true };

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
// specialties, but reputation/bugsFound/totalRewards/rank/status stay admin-only
// (they're computed/trust signals, not something the hacker should set themselves).
export async function updateOwnHacker(userId: string, input: { specialties?: string[] }) {
  const hacker = await getOwnHackerProfile(userId);
  return prisma.hackerProfile.update({ where: { id: hacker.id }, data: input, include: hackerDetailInclude });
}

export async function listHackers() {
  return prisma.hackerProfile.findMany({ include: hackerDetailInclude, orderBy: { reputation: "desc" } });
}

export async function getHackerById(id: string) {
  const hacker = await prisma.hackerProfile.findUnique({ where: { id }, include: hackerDetailInclude });
  if (!hacker) throw new HttpError(404, "Hacker introuvable");
  return hacker;
}

export interface UpdateHackerInput {
  reputation?: number;
  bugsFound?: number;
  totalRewards?: number;
  rank?: number;
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
