import { prisma } from "../prisma.js";

// Interpretation of SystemConfig.require2FA — like passwordComplexity before it, this
// toggle (SecuritySettingsTab.tsx) was saved and displayed but never read back anywhere.
// Its help text ("Pour tous les comptes administrateurs et entreprises") is the only hint
// of intended scope in the codebase — read literally as exactly the "admin" and
// "entreprise" roles, not every non-hacker role: triage/finance/support accounts have
// no `settings.view` permission by default and so no page in the frontend where they
// could act on a nudge (MfaSection.tsx only renders inside pages reachable by the
// account it's for). Flagging them would be a dead end with no way to comply. Not a
// hard login block either way — an account missing MFA while this is on still
// authenticates, but the frontend surfaces mfaEnrollmentRequired to nudge enrollment.
const REQUIRED_ROLES = new Set(["admin", "entreprise"]);

export async function isMfaEnrollmentRequired(role: string, hasVerifiedTotp: boolean): Promise<boolean> {
  if (hasVerifiedTotp || !REQUIRED_ROLES.has(role)) return false;
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return !!config?.require2FA;
}
