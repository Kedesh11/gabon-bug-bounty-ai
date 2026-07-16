import { Router } from "express";
import { z } from "zod";
import { CardBrand, CryptoType, HackerStatus, MobileMoneyProvider, PaymentMethod, PreferredCurrency } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export const hackersRouter = Router();
hackersRouter.use(requireAuth);

async function getOwnHackerProfile(userId: string) {
  const hacker = await prisma.hackerProfile.findUnique({ where: { profileId: userId } });
  if (!hacker) throw new HttpError(403, "Aucun profil hacker associé à ce compte");
  return hacker;
}

hackersRouter.get(
  "/me/payment-config",
  requirePermission("hackers.self.manage"),
  asyncHandler(async (req, res) => {
    const hacker = await getOwnHackerProfile(req.user!.id);
    const config = await prisma.hackerPaymentConfig.findUnique({ where: { hackerId: hacker.id } });
    res.json({ config });
  }),
);

// Note: only the card's last 4 digits are ever accepted/stored here — the CVV has no
// column in the schema at all (PCI: never persist it), and the full PAN is never sent to us.
const paymentConfigSchema = z.object({
  gainsEnabled: z.boolean().optional(),
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)).optional(),
  mobileMoneyProvider: z.nativeEnum(MobileMoneyProvider).optional(),
  phoneNumber: z.string().optional(),
  accountName: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  bankCountry: z.string().optional(),
  cardBrand: z.nativeEnum(CardBrand).optional(),
  cardHolderName: z.string().optional(),
  cardNumberLast4: z.string().length(4).optional(),
  cardExpiry: z.string().optional(),
  cardBillingCountry: z.string().optional(),
  paypalEmail: z.string().email().optional(),
  cryptoType: z.nativeEnum(CryptoType).optional(),
  walletAddress: z.string().optional(),
  preferredCurrency: z.nativeEnum(PreferredCurrency).optional(),
  autoWithdrawal: z.boolean().optional(),
  minimumPayoutThreshold: z.string().optional(),
});

hackersRouter.patch(
  "/me/payment-config",
  requirePermission("hackers.self.manage"),
  asyncHandler(async (req, res) => {
    const hacker = await getOwnHackerProfile(req.user!.id);
    const body = paymentConfigSchema.parse(req.body);

    const config = await prisma.hackerPaymentConfig.upsert({
      where: { hackerId: hacker.id },
      update: body,
      create: { hackerId: hacker.id, ...body },
    });

    res.json({ config });
  }),
);

const updateOwnHackerSchema = z.object({
  specialties: z.array(z.string()).optional(),
});

// Self-service subset of updateHackerSchema below — a hacker can edit their own
// specialties, but reputation/bugsFound/totalRewards/rank/status stay admin-only
// (they're computed/trust signals, not something the hacker should set themselves).
hackersRouter.patch(
  "/me",
  requirePermission("hackers.self.manage"),
  asyncHandler(async (req, res) => {
    const hacker = await getOwnHackerProfile(req.user!.id);
    const body = updateOwnHackerSchema.parse(req.body);
    const updated = await prisma.hackerProfile.update({
      where: { id: hacker.id },
      data: body,
      include: { profile: true, badges: true },
    });
    res.json({ hacker: updated });
  }),
);

hackersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const hackers = await prisma.hackerProfile.findMany({
      include: { profile: true, badges: true },
      orderBy: { reputation: "desc" },
    });
    res.json({ hackers });
  }),
);

hackersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const hacker = await prisma.hackerProfile.findUnique({
      where: { id: req.params.id },
      include: { profile: true, badges: true },
    });
    if (!hacker) throw new HttpError(404, "Hacker introuvable");
    res.json({ hacker });
  }),
);

const updateHackerSchema = z.object({
  reputation: z.number().int().optional(),
  bugsFound: z.number().int().optional(),
  totalRewards: z.number().int().optional(),
  rank: z.number().int().optional(),
  specialties: z.array(z.string()).optional(),
  status: z.nativeEnum(HackerStatus).optional(),
});

hackersRouter.patch(
  "/:id",
  requirePermission("hackers.manage"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.hackerProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Hacker introuvable");

    const body = updateHackerSchema.parse(req.body);
    const hacker = await prisma.hackerProfile.update({
      where: { id: req.params.id },
      data: body,
      include: { profile: true, badges: true },
    });
    res.json({ hacker });
  }),
);

hackersRouter.delete(
  "/:id",
  requirePermission("hackers.manage"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.hackerProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Hacker introuvable");
    await prisma.hackerProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
