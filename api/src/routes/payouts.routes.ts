import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { createPayout } from "../services/payments/paymentService.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";

export const payoutsRouter = Router();
payoutsRouter.use(requireAuth);

payoutsRouter.post(
  "/reports/:id",
  requirePermission("payouts.create"),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        hacker: { include: { paymentConfig: true, profile: true } },
        payout: true,
      },
    });
    if (!report) throw new HttpError(404, "Rapport introuvable");
    if (report.status !== "accepte") throw new HttpError(400, "Le rapport doit être accepté avant tout versement");
    if (report.reward <= 0) throw new HttpError(400, "Aucune récompense définie sur ce rapport");
    if (report.payout) throw new HttpError(409, "Un versement existe déjà pour ce rapport");

    const config = report.hacker.paymentConfig;
    const usesMobileMoney = Boolean(config?.gainsEnabled && config.paymentMethods.includes("mobile_money") && config.phoneNumber);

    const payout = await prisma.payout.create({
      data: {
        reportId: report.id,
        hackerId: report.hackerId,
        provider: report.hacker.stripeAccountId ? "stripe" : "cinetpay",
        amount: report.reward,
        currency: "XAF",
      },
    });

    try {
      const result = await createPayout(payout.id, report.reward, "XAF", {
        hackerName: report.hacker.profile.name,
        stripeAccountId: report.hacker.stripeAccountId,
        mobileMoneyPhoneNumber: usesMobileMoney ? (config!.phoneNumber as string) : null,
        mobileMoneyProvider: usesMobileMoney ? (config!.mobileMoneyProvider as string) : null,
      });

      const updated = await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "succeeded", provider: result.provider, providerRef: result.providerRef },
      });

      await createPlatformLog({
        type: "system",
        level: "info",
        message: `Versement de ${report.reward} XAF effectué pour le rapport "${report.title}"`,
        source: "payouts.routes",
        userId: req.user!.id,
      });

      res.status(201).json({ payout: updated });
    } catch (err) {
      await prisma.payout.update({ where: { id: payout.id }, data: { status: "failed" } });
      await createPlatformLog({
        type: "system",
        level: "error",
        message: `Échec du versement pour le rapport "${report.title}": ${err instanceof Error ? err.message : String(err)}`,
        source: "payouts.routes",
        userId: req.user!.id,
      });
      throw err;
    }
  }),
);
