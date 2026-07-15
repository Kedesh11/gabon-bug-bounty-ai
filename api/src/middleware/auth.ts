import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { prisma } from "../prisma.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
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

  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  if (!profile) {
    res.status(401).json({ error: "Profil introuvable pour cet utilisateur" });
    return;
  }

  req.user = { id: profile.id, email: profile.email, role: profile.role };
  next();
}
