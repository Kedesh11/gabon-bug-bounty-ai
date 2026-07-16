import type { NextFunction, Request, Response } from "express";

// Replaces the old requireRole(...) — checks the caller's role's permissions (dynamic,
// data-driven) rather than a hardcoded role-key allowlist. A brand-new role granted an
// existing permission passes this check automatically, no code change required.
export function requirePermission(...permissionKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentification requise" });
      return;
    }
    const hasPermission = permissionKeys.some((key) => req.user!.permissions.includes(key));
    if (!hasPermission) {
      res.status(403).json({ error: "Permission refusée pour cette action" });
      return;
    }
    next();
  };
}
