import type { CookieOptions, Request, Response } from "express";
import { env } from "../env.js";

export const ACCESS_COOKIE = "bb_at";
export const REFRESH_COOKIE = "bb_rt";

// GoTrue refresh tokens don't expire on their own; the cookie caps how long a browser
// keeps one without the user coming back.
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
}

// The tokens live only in httpOnly cookies — page JavaScript (and so any XSS) can't read
// them. The refresh token is scoped to /api/auth so it is not sent along with every request.
export function setSessionCookies(res: Response, session: SessionTokens) {
  const accessMaxAgeMs = Math.max(
    (session.expires_in ?? (session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : 3600)) * 1000,
    1000,
  );
  res.cookie(ACCESS_COOKIE, session.access_token, { ...baseOptions(), path: "/", maxAge: accessMaxAgeMs });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { ...baseOptions(), path: "/api/auth", maxAge: REFRESH_COOKIE_MAX_AGE_MS });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: "/api/auth" });
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
