import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";

// Mirrors the role-gating semantics of src/components/ProtectedRoute.tsx on the frontend,
// but enforced server-side — the only place authorization can't be bypassed by the client.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentification requise" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Rôle non autorisé pour cette action" });
      return;
    }
    next();
  };
}
