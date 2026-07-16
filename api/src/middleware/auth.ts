import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { prisma } from "../prisma.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  // The role *key* (e.g. "admin", or any custom role's key) — kept as a plain string for
  // the handful of ownership checks that compare it directly (e.g. "is this caller an
  // entreprise-type account"). Everything else should gate on `permissions`, not this.
  role: string;
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Token invalide ou expiré" });
    return;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!profile) {
    res.status(401).json({ error: "Profil introuvable pour cet utilisateur" });
    return;
  }

  req.user = {
    id: profile.id,
    email: profile.email,
    role: profile.role.key,
    permissions: profile.role.permissions.map((rp) => rp.permission.key),
  };
  next();
}
