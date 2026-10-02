import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, getRequestToken } from "../middleware/auth.js";
import { serializeProfile, profileRoleInclude } from "../lib/serializeProfile.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer.js";
import { loginRateLimit, forgotPasswordRateLimit, resendVerificationRateLimit } from "../middleware/rateLimit.js";
import { getSystemPasswordComplexity, validatePasswordComplexity } from "../lib/passwordPolicy.js";
import { setSessionCookies, clearSessionCookies, readCookie, REFRESH_COOKIE } from "../lib/sessionCookies.js";
import { hashToken, createPasswordResetToken } from "../lib/resetTokens.js";
import { isMfaEnrollmentRequired } from "../lib/mfaPolicy.js";

export const authRouter = Router();

// Exported for mfa.routes.ts's login-verify (the second step of a step-up login),
// which needs the exact same shape once it resolves its own profile.
export const profileInclude = { hackerProfile: true, entrepriseProfile: true, ...profileRoleInclude };

// Self-registration only ever creates a hacker or an entreprise account — the only two
// roles wired to a public signup flow in the frontend (Inscription.tsx). Staff roles
// (admin/triage/finance/support/any custom role) are assigned by an admin, never here.
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  name: z.string().min(2),
  role: z.enum(["hacker", "entreprise"]),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const complexity = await getSystemPasswordComplexity();
    const complexityError = validatePasswordComplexity(body.password, complexity);
    if (complexityError) throw new HttpError(400, complexityError);

    const role = await prisma.role.findUnique({ where: { key: body.role } });
    if (!role) throw new HttpError(500, `Rôle "${body.role}" introuvable — la base n'est pas correctement initialisée`);

    // email_confirm: false — GoTrue itself then refuses signInWithPassword until the
    // account is confirmed (supabase/config.toml: auth.email.enable_confirmations =
    // true). No auto-login after this anymore: there is no session to hand back until
    // the address is verified, see issueEmailVerificationToken below.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false,
    });
    if (createError || !created.user) {
      throw new HttpError(400, createError?.message ?? "Impossible de créer le compte");
    }

    const profile = await prisma.profile.create({
      data: {
        id: created.user.id,
        email: body.email,
        name: body.name,
        roleId: role.id,
        ...(body.role === "hacker" ? { hackerProfile: { create: {} } } : {}),
        ...(body.role === "entreprise" ? { entrepriseProfile: { create: { sector: "" } } } : {}),
      },
      include: profileInclude,
    });

    const { sent: emailSent } = await issueEmailVerificationToken(profile);

    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Nouveau compte ${body.role} créé, en attente de confirmation email (${body.email})`,
      source: "auth.routes",
      userId: profile.id,
      metadata: { emailSent },
    });

    res.status(201).json({ profile: serializeProfile(profile), emailSent, requiresEmailVerification: true });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || !data.session) {
      await createPlatformLog({
        type: "security",
        level: "warning",
        message: "Tentative de connexion échouée",
        source: "auth.routes",
        metadata: { email: body.email, code: error?.code },
      });
      // GoTrue itself enforces this (auth.email.enable_confirmations = true) — this
      // is a real "your credentials are fine, your account just isn't usable yet"
      // case, worth telling the caller apart from a wrong password so the frontend
      // can point them at /renvoyer-verification instead of a generic error.
      if (error?.code === "email_not_confirmed") {
        throw new HttpError(403, "Confirmez votre email avant de vous connecter — vérifiez votre boîte de réception.");
      }
      throw new HttpError(401, "Email ou mot de passe invalide");
    }

    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: profileInclude,
    });
    if (!profile) {
      throw new HttpError(401, "Profil introuvable pour cet utilisateur");
    }

    // Password verified, but a verified TOTP factor means the caller isn't done yet:
    // signInWithPassword only ever returns an aal1 session (see mfa.routes.ts's
    // /login-verify for the step-up). Not a full login response — no `profile`, and
    // the token handed back is only ever valid for that one follow-up call.
    const verifiedFactor = data.user.factors?.find((f) => f.factor_type === "totp" && f.status === "verified");
    if (verifiedFactor) {
      res.json({ mfaRequired: true, factorId: verifiedFactor.id, aal1AccessToken: data.session.access_token });
      return;
    }

    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Connexion réussie (${profile.email})`,
      source: "auth.routes",
      userId: profile.id,
    });

    const mfaEnrollmentRequired = await isMfaEnrollmentRequired(profile.role.key, false);

    // The tokens go into httpOnly cookies and are deliberately NOT echoed in the body.
    setSessionCookies(res, data.session);
    res.json({ profile: serializeProfile(profile), mfaEnrollmentRequired });
  }),
);

// The refresh token normally comes from its own httpOnly cookie; the body field remains for
// non-browser clients.
const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
});

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body ?? {});
    const refreshToken = readCookie(req, REFRESH_COOKIE) ?? body.refresh_token;
    if (!refreshToken) throw new HttpError(401, "Session expirée, veuillez vous reconnecter");

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      clearSessionCookies(res);
      throw new HttpError(401, "Session expirée, veuillez vous reconnecter");
    }

    setSessionCookies(res, data.session);
    res.json({ refreshed: true });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await supabaseAdmin.auth.admin.signOut(getRequestToken(req)!, "global");
    clearSessionCookies(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: profileInclude,
    });

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(req.user!.id);
    const hasVerifiedTotp = !!userData.user?.factors?.some((f) => f.factor_type === "totp" && f.status === "verified");
    const mfaEnrollmentRequired = await isMfaEnrollmentRequired(profile.role.key, hasVerifiedTotp);

    res.json({ profile: serializeProfile(profile), mfaEnabled: hasVerifiedTotp, mfaEnrollmentRequired });
  }),
);

const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  paymentAlerts: z.boolean(),
  reportStatusAlerts: z.boolean(),
  securityAlerts: z.boolean(),
});

// Email isn't editable here: it's owned by Supabase Auth (auth.users) and changing it
// requires the reconfirmation flow (supabase.auth.updateUser) — out of scope for now.
const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
});

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = updateMeSchema.parse(req.body);
    const profile = await prisma.profile.update({
      where: { id: req.user!.id },
      data: body,
      include: profileInclude,
    });
    res.json({ profile: serializeProfile(profile) });
  }),
);

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Single-use enforcement for both token flows: the claim is one conditional UPDATE, so two
// simultaneous requests carrying the same link can't both pass a read-then-write check.
// Returns the token's profileId when this call won the claim, null if the token is unknown,
// already used or expired.
async function claimToken(
  model: "passwordResetToken" | "emailVerificationToken",
  tokenHash: string,
): Promise<string | null> {
  const delegate = prisma[model] as unknown as {
    findUnique(args: { where: { tokenHash: string } }): Promise<{ id: string; profileId: string } | null>;
    updateMany(args: { where: object; data: object }): Promise<{ count: number }>;
  };
  const row = await delegate.findUnique({ where: { tokenHash } });
  if (!row) return null;
  const claimed = await delegate.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? row.profileId : null;
}

// Best-effort: a password reset must end every session opened with the old password
// (the usual reason for resetting is "someone else may have it"). GoTrue keeps sessions
// across an admin password change, and supabase-js only exposes signOut-by-JWT, so the
// rows are removed directly. A failure here (e.g. a plain Postgres without the auth schema)
// must not fail the reset itself.
async function revokeAllSessions(profileId: string) {
  try {
    await prisma.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${profileId}::uuid`;
  } catch (err) {
    console.error("[auth] could not revoke sessions after password reset:", err);
  }
}

// The actual work of issuing a reset token/email, split out of the route handler and
// exported so tests can await it directly (see test/auth.test.ts) — the same reasoning
// as orchestrator.ts's runMcpPipeline vs. its fire-and-forget HTTP trigger. Deletes this
// profile's previous tokens first: at most one outstanding reset link per account at a
// time, both so an old email link can never coexist with a newer one and so this table
// never accumulates stale rows without needing a separate cleanup job.
export async function issuePasswordResetToken(profile: { id: string; email: string }) {
  const rawToken = await createPasswordResetToken(profile.id, RESET_TOKEN_TTL_MS);

  const resetUrl = `${env.FRONTEND_URL}/reinitialiser-mot-de-passe?token=${rawToken}`;
  const { sent, error } = await sendPasswordResetEmail({ to: profile.email, resetUrl });

  await createPlatformLog({
    type: "security",
    level: "info",
    message: `Demande de réinitialisation de mot de passe (${profile.email})`,
    source: "auth.routes",
    userId: profile.id,
    metadata: { emailSent: sent, emailError: error },
  });

  return rawToken;
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Always responds 200 with the same message *and, critically, the same latency*
// whether or not the email is known. The token INSERT and the email send (a real
// network call to Resend once configured) used to run only on the "known email"
// branch and were awaited before responding — response time alone let a caller
// distinguish the two cases even though the JSON body was identical. Firing
// issuePasswordResetToken without awaiting it removes that gap: both branches now
// do the same amount of work (a single SELECT) before responding.
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { email: body.email } });
    if (profile) {
      issuePasswordResetToken(profile).catch((err) => {
        console.error("[auth] failed to issue password reset token:", err);
      });
    }

    res.status(200).json({
      message: "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.",
    });
  }),
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);

    const complexity = await getSystemPasswordComplexity();
    const complexityError = validatePasswordComplexity(body.password, complexity);
    if (complexityError) throw new HttpError(400, complexityError);

    // Claimed BEFORE changing the password: a concurrent second request with the same link
    // loses the claim and never reaches updateUserById.
    const profileId = await claimToken("passwordResetToken", hashToken(body.token));
    if (!profileId) throw new HttpError(400, "Lien de réinitialisation invalide ou expiré");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
      password: body.password,
    });
    if (error) {
      // The link wasn't actually consumed by a successful reset — let the user retry it.
      await prisma.passwordResetToken.updateMany({ where: { profileId }, data: { usedAt: null } });
      throw new HttpError(500, "Impossible de réinitialiser le mot de passe");
    }

    await revokeAllSessions(profileId);

    await createPlatformLog({
      type: "security",
      level: "info",
      message: "Mot de passe réinitialisé via lien email",
      source: "auth.routes",
      userId: profileId,
    });

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  }),
);

// Same shape/reasoning as issuePasswordResetToken: exported so tests can await it
// directly, deletes this profile's previous verification tokens first (at most one
// outstanding link at a time, table stays bounded without a separate cleanup job).
export async function issueEmailVerificationToken(profile: { id: string; email: string }) {
  await prisma.emailVerificationToken.deleteMany({ where: { profileId: profile.id } });

  const rawToken = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      profileId: profile.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${env.FRONTEND_URL}/verifier-email?token=${rawToken}`;
  return sendVerificationEmail({ to: profile.email, verifyUrl });
}

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

authRouter.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const body = verifyEmailSchema.parse(req.body);
    const profileId = await claimToken("emailVerificationToken", hashToken(body.token));
    if (!profileId) throw new HttpError(400, "Lien de confirmation invalide ou expiré");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
      email_confirm: true,
    });
    if (error) {
      await prisma.emailVerificationToken.updateMany({ where: { profileId }, data: { usedAt: null } });
      throw new HttpError(500, "Impossible de confirmer l'email");
    }

    await createPlatformLog({
      type: "security",
      level: "info",
      message: "Email confirmé via lien",
      source: "auth.routes",
      userId: profileId,
    });

    res.status(200).json({ message: "Email confirmé avec succès" });
  }),
);

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

// Same anti-enumeration posture as /forgot-password: identical response whether the
// account exists, is unknown, or is already confirmed — and the actual work fires
// without being awaited so response latency can't be used to tell those apart either.
authRouter.post(
  "/resend-verification",
  resendVerificationRateLimit,
  asyncHandler(async (req, res) => {
    const body = resendVerificationSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { email: body.email } });
    if (profile) {
      supabaseAdmin.auth.admin.getUserById(profile.id).then(({ data }) => {
        if (data.user && !data.user.email_confirmed_at) {
          return issueEmailVerificationToken(profile);
        }
      }).catch((err) => {
        console.error("[auth] failed to resend verification email:", err);
      });
    }

    res.status(200).json({
      message: "Si un compte non confirmé existe pour cet email, un lien de confirmation vient d'être envoyé.",
    });
  }),
);
