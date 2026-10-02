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

type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; status: number; error: string };

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

async function resolveUser(token: string): Promise<AuthResult> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Token invalide ou expiré" };

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!profile) return { ok: false, status: 401, error: "Profil introuvable pour cet utilisateur" };

  return {
    ok: true,
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role.key,
      permissions: profile.role.permissions.map((rp) => rp.permission.key),
    },
  };
}

// Express 4 does not catch rejections from async middleware: without the try/catch, a
// Supabase/Prisma outage here would be an unhandled rejection (hung request or crashed
// process) instead of a clean error response. Errors go through next() to errorHandler.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }

  try {
    const result = await resolveUser(token);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    req.user = result.user;
    next();
  } catch (err) {
    next(err);
  }
}

// For public routes whose response depends on who is asking (e.g. a programme that is
// only visible to its owner while pending validation). Never rejects the request: no
// token, or a bad one, simply means "anonymous". Real outages still go to errorHandler.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const result = await resolveUser(token);
    if (result.ok) req.user = result.user;
    next();
  } catch (err) {
    next(err);
  }
}
