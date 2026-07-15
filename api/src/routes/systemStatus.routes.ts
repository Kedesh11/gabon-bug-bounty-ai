import { Router } from "express";
import { prisma } from "../prisma.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { stripe } from "../services/payments/stripe/client.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const systemStatusRouter = Router();
systemStatusRouter.use(requireAuth, requireRole("admin"));

type ServiceStatus = "online" | "offline";

// Each check is a real, lightweight, read-only call against the actual dependency —
// not a stored/cached flag — so a genuinely down service shows up immediately.

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "online";
  } catch {
    return "offline";
  }
}

async function checkAuth(): Promise<ServiceStatus> {
  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    return error ? "offline" : "online";
  } catch {
    return "offline";
  }
}

async function checkPayments(): Promise<ServiceStatus> {
  try {
    // Deliberately not stripe.balance.retrieve()/accounts.retrieve(): claimable sandbox
    // keys (see api/README.md) are restricted and 403 on those, but can list Checkout
    // Sessions — the same capability the app actually uses for collection.
    await stripe.checkout.sessions.list({ limit: 1 });
    return "online";
  } catch {
    return "offline";
  }
}

systemStatusRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [database, auth, payments] = await Promise.all([checkDatabase(), checkAuth(), checkPayments()]);
    res.json({ database, auth, payments, uptimeSeconds: Math.round(process.uptime()) });
  }),
);
