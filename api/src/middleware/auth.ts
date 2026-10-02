import type { NextFunction, Request, Response } from "express";
import { ACCESS_COOKIE, readCookie } from "../lib/sessionCookies.js";
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

// The web app authenticates with the httpOnly access-token cookie; an explicit Bearer header
// (tests, scripts, the transient aal1 token) takes precedence when present.
export function getRequestToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return readCookie(req, ACCESS_COOKIE);
}

// Authenticity was already established by getUser (GoTrue verified the signature), so the
// payload is only read here, never trusted on its own. Supabase marks a session "aal1"
// (password only) or "aal2" (password + second factor).
function jwtAssuranceLevel(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

async function resolveUser(token: string): Promise<AuthResult> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Token invalide ou expiré" };

  // /login hands back an aal1 token to a user who still owes the TOTP code (the step-up
  // second call is /api/auth/mfa/login-verify). That token is a perfectly valid Supabase
  // token — without this check it would work as a Bearer on every route and make the second
  // factor optional for anyone who knows the password. An account with a verified TOTP
  // factor is only ever served on an aal2 session.
  const hasVerifiedTotp = data.user.factors?.some((f) => f.factor_type === "totp" && f.status === "verified");
  if (hasVerifiedTotp && jwtAssuranceLevel(token) !== "aal2") {
    return { ok: false, status: 401, error: "Vérification en deux étapes requise" };
  }

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
  const token = getRequestToken(req);
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
  const token = getRequestToken(req);
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
