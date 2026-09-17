import rateLimit from "express-rate-limit";

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
