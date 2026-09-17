import { Router } from "express";
import { z } from "zod";
import type { Request } from "express";
import { prisma } from "../prisma.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeProfile } from "../lib/serializeProfile.js";
import { profileInclude } from "./auth.routes.js";
import { enrollTotpFactor, challengeFactor, verifyFactor, unenrollFactor } from "../lib/gotrueMfa.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { mfaVerifyRateLimit } from "../middleware/rateLimit.js";

export const mfaRouter = Router();

// Same one-liner as /logout — requireAuth verifies the token but doesn't keep the raw
// string around, and every call here needs to forward it to GoTrue as the acting user.
function bearerToken(req: Request): string {
  return req.headers.authorization!.slice("Bearer ".length);
}

mfaRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(req.user!.id);
    const factor = data.user?.factors?.find((f) => f.factor_type === "totp" && f.status === "verified");
    res.json({ enrolled: !!factor, factorId: factor?.id ?? null });
  }),
);

mfaRouter.post(
  "/enroll",
  requireAuth,
  asyncHandler(async (req, res) => {
    const factor = await enrollTotpFactor(bearerToken(req), `Gabon Bug Bounty (${req.user!.email})`);
    res.status(201).json({ factorId: factor.id, qrCode: factor.totp.qr_code, secret: factor.totp.secret, uri: factor.totp.uri });
  }),
);

const confirmEnrollSchema = z.object({
  factorId: z.string().min(1),
  code: z.string().length(6),
});

mfaRouter.post(
  "/enroll/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = confirmEnrollSchema.parse(req.body);
    const token = bearerToken(req);

    const challenge = await challengeFactor(token, body.factorId);
    const verified = await verifyFactor(token, body.factorId, challenge.id, body.code);

    await createPlatformLog({
      type: "security",
      level: "info",
      message: "2FA (TOTP) activé",
      source: "mfa.routes",
      userId: req.user!.id,
    });

    // Verifying the factor promotes the session to aal2 and (per Supabase's own
    // behavior) signs out every other session on the account — the caller must adopt
    // this new session, their previous access token is no longer the current one.
    res.status(200).json({
      message: "2FA activé avec succès",
      session: {
        access_token: verified.access_token,
        refresh_token: verified.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + verified.expires_in,
      },
    });
  }),
);

mfaRouter.delete(
  "/factors/:factorId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await unenrollFactor(bearerToken(req), req.params.factorId);

    await createPlatformLog({
      type: "security",
      level: "warning",
      message: "2FA (TOTP) désactivé",
      source: "mfa.routes",
      userId: req.user!.id,
    });

    res.status(204).send();
  }),
);

const loginVerifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().length(6),
  aal1AccessToken: z.string().min(1),
});

// The second step of a step-up login (see auth.routes.ts's /login: a verified TOTP
// factor makes it respond mfaRequired instead of a full session). Deliberately not
// behind requireAuth — the caller doesn't have a full session yet, only the aal1 token
// /login handed back, which is what authenticates this call to GoTrue.
mfaRouter.post(
  "/login-verify",
  mfaVerifyRateLimit,
  asyncHandler(async (req, res) => {
    const body = loginVerifySchema.parse(req.body);

    const challenge = await challengeFactor(body.aal1AccessToken, body.factorId);
    const verified = await verifyFactor(body.aal1AccessToken, body.factorId, challenge.id, body.code);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(verified.access_token);
    if (userError || !userData.user) throw new HttpError(401, "Session invalide");

    const profile = await prisma.profile.findUnique({ where: { id: userData.user.id }, include: profileInclude });
    if (!profile) throw new HttpError(401, "Profil introuvable pour cet utilisateur");

    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Connexion réussie (2FA, ${profile.email})`,
      source: "mfa.routes",
      userId: profile.id,
    });

    res.json({
      profile: serializeProfile(profile),
      session: {
        access_token: verified.access_token,
        refresh_token: verified.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + verified.expires_in,
      },
    });
  }),
);
