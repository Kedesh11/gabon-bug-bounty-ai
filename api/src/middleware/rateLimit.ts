import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Both limiters below use express-rate-limit's default MemoryStore — counters live in
// this process's memory. Correct for the single-instance deployment this app has today
// (see api/README.md's Déploiement section), but if the API is ever scaled to more than
// one instance behind a load balancer, each instance gets its own counter and the real
// ceiling becomes limit × instance count. At that point these need a shared store
// (e.g. the `rate-limit-redis` package) instead — no such need currently exists.
const skipInTests = () => process.env.NODE_ENV === "test";

// Guards the one endpoint that lets an attacker test passwords against a known
// email — 10 attempts per 15 minutes per IP is enough for a real user who mistypes
// a password a few times, not enough for a meaningful brute-force run.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Trop de tentatives de connexion. Réessayez dans quelques minutes." },
});

// Guards against using password-reset requests as a free email bomb against a
// victim's inbox (each call sends an email if the address exists) rather than
// against brute-forcing the token itself (32 random bytes — infeasible to guess).
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Trop de demandes de réinitialisation. Réessayez dans quelques minutes." },
});

// Same reasoning as forgotPasswordRateLimit — guards POST /api/auth/resend-verification
// against being used as a free email bomb against a signup address.
export const resendVerificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Trop de demandes de renvoi. Réessayez dans quelques minutes." },
});

// Guards POST /api/auth/mfa/login-verify — a 6-digit TOTP code is 1 in a million,
// brute-forceable in bulk without a limit here even though GoTrue itself also
// time-boxes the underlying challenge.
export const mfaVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
});

// For authenticated endpoints that are cheap to call and expensive (or noisy) to serve —
// each report submission can start 7 LLM calls, each category proposal pollutes a shared
// catalogue. Keyed by account rather than IP so one user can't spread the load over
// addresses, and so offices/NATs sharing an IP don't throttle each other. Must be placed
// AFTER requireAuth in the route chain (falls back to the IP if there is no user).
function perUserLimit(limit: number, message: string, windowMs = 60 * 60 * 1000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTests,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
    message: { error: message },
  });
}

export const reportSubmitRateLimit = perUserLimit(20, "Trop de rapports soumis en peu de temps. Réessayez dans une heure.");
export const uploadRateLimit = perUserLimit(30, "Trop d'envois de fichiers. Réessayez dans une heure.");
export const categoryProposalRateLimit = perUserLimit(20, "Trop de catégories proposées. Réessayez dans une heure.");
export const ticketCreateRateLimit = perUserLimit(10, "Trop de tickets ouverts en peu de temps. Réessayez dans une heure.");
