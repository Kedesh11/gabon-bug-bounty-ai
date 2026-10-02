import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, readCookie } from "../lib/sessionCookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Header the web client adds to every request. A cross-origin page cannot send a custom
// header without a CORS preflight, and the API only approves its own frontend origin.
export const CSRF_HEADER = "x-requested-with";
export const CSRF_HEADER_VALUE = "bb-web";

// Cookies are sent automatically by the browser, so cookie auth needs CSRF protection that
// a Bearer header never did. Two layers on every state-changing request:
//   1. If the browser says where the request comes from (Origin), it must be our frontend.
//   2. A request carrying session cookies and NO explicit Bearer header must also carry the
//      custom header above — a plain <form> or fetch from another site can't.
// Webhooks (Stripe, CinetPay) come from servers: no Origin, no session cookies, so untouched.
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin && origin !== env.CORS_ORIGIN) {
    res.status(403).json({ error: "Origine non autorisée" });
    return;
  }

  const usesBearer = req.headers.authorization?.startsWith("Bearer ");
  const hasSessionCookie = readCookie(req, ACCESS_COOKIE) !== null || readCookie(req, REFRESH_COOKIE) !== null;
  if (!usesBearer && hasSessionCookie && req.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
    res.status(403).json({ error: "Requête refusée (protection CSRF)" });
    return;
  }

  next();
}
