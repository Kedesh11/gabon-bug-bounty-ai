import { randomBytes, createHash } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeProfile, profileRoleInclude } from "../lib/serializeProfile.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";
import { loginRateLimit, forgotPasswordRateLimit } from "../middleware/rateLimit.js";
import { getSystemPasswordComplexity, validatePasswordComplexity } from "../lib/passwordPolicy.js";

export const authRouter = Router();

const profileInclude = { hackerProfile: true, entrepriseProfile: true, ...profileRoleInclude };

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

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
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

    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signInError || !session.session) {
      throw new HttpError(500, "Compte créé mais échec de connexion automatique");
    }

    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Nouveau compte ${body.role} créé (${body.email})`,
      source: "auth.routes",
      userId: profile.id,
    });

    res.status(201).json({ profile: serializeProfile(profile), session: session.session });
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
        metadata: { email: body.email },
      });
      throw new HttpError(401, "Email ou mot de passe invalide");
    }

    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: profileInclude,
    });
    if (!profile) {
      throw new HttpError(401, "Profil introuvable pour cet utilisateur");
    }

    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Connexion réussie (${profile.email})`,
      source: "auth.routes",
      userId: profile.id,
    });

    res.json({ profile: serializeProfile(profile), session: data.session });
  }),
);

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: body.refresh_token });
    if (error || !data.session) {
      throw new HttpError(401, "Session expirée, veuillez vous reconnecter");
    }

    res.json({ session: data.session });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization!;
    const token = header.slice("Bearer ".length);
    await supabaseAdmin.auth.admin.signOut(token, "global");
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
    res.json({ profile: serializeProfile(profile) });
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

function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

// The actual work of issuing a reset token/email, split out of the route handler and
// exported so tests can await it directly (see test/auth.test.ts) — the same reasoning
// as orchestrator.ts's runMcpPipeline vs. its fire-and-forget HTTP trigger. Deletes this
// profile's previous tokens first: at most one outstanding reset link per account at a
// time, both so an old email link can never coexist with a newer one and so this table
// never accumulates stale rows without needing a separate cleanup job.
export async function issuePasswordResetToken(profile: { id: string; email: string }) {
  await prisma.passwordResetToken.deleteMany({ where: { profileId: profile.id } });

  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      profileId: profile.id,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

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

    const tokenHash = hashResetToken(body.token);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "Lien de réinitialisation invalide ou expiré");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(resetToken.profileId, {
      password: body.password,
    });
    if (error) throw new HttpError(500, "Impossible de réinitialiser le mot de passe");

    // issuePasswordResetToken deletes any prior row for this profile before creating a
    // new one, so this is always the only row for the account — marking it used is
    // enough, no sibling rows to invalidate alongside it.
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });

    await createPlatformLog({
      type: "security",
      level: "info",
      message: "Mot de passe réinitialisé via lien email",
      source: "auth.routes",
      userId: resetToken.profileId,
    });

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  }),
);
