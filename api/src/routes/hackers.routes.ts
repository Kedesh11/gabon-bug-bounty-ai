import { Router } from "express";
import { z } from "zod";
import { CardBrand, CryptoType, HackerStatus, MobileMoneyProvider, PaymentMethod, PreferredCurrency } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  getOwnPaymentConfig,
  updateOwnPaymentConfig,
  updateOwnHacker,
  listHackers,
  getHackerById,
  updateHacker,
  deleteHacker,
} from "../services/hackers/hackersService.js";

export const hackersRouter = Router();
hackersRouter.use(requireAuth);

hackersRouter.get(
  "/me/payment-config",
  requirePermission("hackers.self.manage"),
  asyncHandler(async (req, res) => {
    const config = await getOwnPaymentConfig(req.user!.id);
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
    const body = paymentConfigSchema.parse(req.body);
    const config = await updateOwnPaymentConfig(req.user!.id, body);
    res.json({ config });
  }),
);

const updateOwnHackerSchema = z.object({
  specialties: z.array(z.string()).optional(),
});

hackersRouter.patch(
  "/me",
  requirePermission("hackers.self.manage"),
  asyncHandler(async (req, res) => {
    const body = updateOwnHackerSchema.parse(req.body);
    const hacker = await updateOwnHacker(req.user!.id, body);
    res.json({ hacker });
  }),
);

hackersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const hackers = await listHackers();
    res.json({ hackers });
  }),
);

hackersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const hacker = await getHackerById(req.params.id);
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
    const body = updateHackerSchema.parse(req.body);
    const hacker = await updateHacker(req.params.id, body);
    res.json({ hacker });
  }),
);

hackersRouter.delete(
  "/:id",
  requirePermission("hackers.manage"),
  asyncHandler(async (req, res) => {
    await deleteHacker(req.params.id);
    res.status(204).send();
  }),
);
