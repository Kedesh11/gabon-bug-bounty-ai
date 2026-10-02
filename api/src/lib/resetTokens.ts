import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../prisma.js";

// SHA-256 of a self-issued token — only the hash is ever stored, never the raw value.
export function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Issues a password-set/reset token for a profile and returns the RAW token (the only
// time it exists in clear). Deletes the profile's previous tokens first: at most one
// outstanding link per account, and the table never accumulates stale rows.
export async function createPasswordResetToken(profileId: string, ttlMs: number) {
  await prisma.passwordResetToken.deleteMany({ where: { profileId } });

  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { profileId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return rawToken;
}
