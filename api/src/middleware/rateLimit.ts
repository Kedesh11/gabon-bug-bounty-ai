import rateLimit from "express-rate-limit";

// Skipped entirely in tests: keyed by IP, and supertest's requests all share one,
// so a normal test run (login/forgot-password exercised across several test files)
// would otherwise trip the ceiling and fail on suite composition, not on a real bug.
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
