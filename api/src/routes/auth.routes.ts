import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  name: z.string().min(2),
  role: z.nativeEnum(UserRole),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

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
        role: body.role,
        ...(body.role === "hacker" ? { hackerProfile: { create: {} } } : {}),
        ...(body.role === "entreprise" ? { entrepriseProfile: { create: { sector: "" } } } : {}),
      },
      include: { hackerProfile: true, entrepriseProfile: true },
    });

    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signInError || !session.session) {
      throw new HttpError(500, "Compte créé mais échec de connexion automatique");
    }

    res.status(201).json({ profile, session: session.session });
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
      throw new HttpError(401, "Email ou mot de passe invalide");
    }

    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: { hackerProfile: true, entrepriseProfile: true },
    });
    if (!profile) {
      throw new HttpError(401, "Profil introuvable pour cet utilisateur");
    }

    res.json({ profile, session: data.session });
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
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
      include: { hackerProfile: true, entrepriseProfile: true },
    });
    res.json({ profile });
  }),
);

// Email isn't editable here: it's owned by Supabase Auth (auth.users) and changing it
// requires the reconfirmation flow (supabase.auth.updateUser) — out of scope for now.
const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
});

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = updateMeSchema.parse(req.body);
    const profile = await prisma.profile.update({
      where: { id: req.user!.id },
      data: body,
      include: { hackerProfile: true, entrepriseProfile: true },
    });
    res.json({ profile });
  }),
);
