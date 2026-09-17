import type { PasswordComplexity } from "@prisma/client";
import { prisma } from "../prisma.js";

// The three levels an admin can pick in SecuritySettingsTab.tsx (SystemConfig.
// passwordComplexity) were never given a concrete definition anywhere in the codebase
// — the setting was saved and displayed but nothing ever read it back. This is this
// app's own interpretation, not a spec carried over from elsewhere; adjust the
// thresholds below if the intended definitions differ.
interface ComplexityRule {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
}

const RULES: Record<PasswordComplexity, ComplexityRule> = {
  standard: { minLength: 8, requireUpper: false, requireLower: false, requireDigit: false, requireSymbol: false },
  elevated: { minLength: 12, requireUpper: true, requireLower: true, requireDigit: true, requireSymbol: false },
  military: { minLength: 16, requireUpper: true, requireLower: true, requireDigit: true, requireSymbol: true },
};

// Every code path that sets a password (register, reset-password, staff provisioning)
// reads the same live SystemConfig row rather than caching it — this is a singleton
// row read on every call, cheap enough not to warrant caching, and it means an admin
// tightening the policy takes effect immediately for the next password set.
export async function getSystemPasswordComplexity(): Promise<PasswordComplexity> {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return config?.passwordComplexity ?? "standard";
}

// Returns a human-readable error message, or null when the password satisfies the level.
export function validatePasswordComplexity(password: string, complexity: PasswordComplexity): string | null {
  const rule = RULES[complexity];
  if (password.length < rule.minLength) {
    return `Le mot de passe doit contenir au moins ${rule.minLength} caractères`;
  }
  if (rule.requireUpper && !/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule";
  }
  if (rule.requireLower && !/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule";
  }
  if (rule.requireDigit && !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre";
  }
  if (rule.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial";
  }
  return null;
}
