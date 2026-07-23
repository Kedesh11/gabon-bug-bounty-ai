import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeProfile, profileRoleInclude } from "../lib/serializeProfile.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";

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
