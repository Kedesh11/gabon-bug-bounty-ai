import { prisma } from "../prisma.js";

// Interpretation of SystemConfig.require2FA — like passwordComplexity before it, this
// toggle (SecuritySettingsTab.tsx) was saved and displayed but never read back anywhere.
// Its help text ("Pour tous les comptes administrateurs et entreprises") is the only hint
// of intended scope in the codebase: applied here to every role except hacker. Not a hard
// login block — an account missing MFA while this is on still authenticates, but the
// frontend surfaces mfaEnrollmentRequired to nudge/gate enrollment in the UI.
export async function isMfaEnrollmentRequired(role: string, hasVerifiedTotp: boolean): Promise<boolean> {
  if (hasVerifiedTotp || role === "hacker") return false;
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return !!config?.require2FA;
}
