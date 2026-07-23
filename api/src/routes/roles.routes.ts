import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listPermissions,
  listRoles,
  createRole,
  updateRolePermissions,
  deleteRole,
  addStaffAccountToRole,
  listStaffAccounts,
  deleteStaffAccount,
} from "../services/roles/rolesService.js";
import { createPlatformLog } from "../services/platformLogs/logsService.js";

export const rolesRouter = Router();
rolesRouter.use(requireAuth, requirePermission("roles.manage"));

rolesRouter.get(
  "/permissions",
  asyncHandler(async (_req, res) => {
    res.json({ permissions: await listPermissions() });
  }),
);

rolesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ roles: await listRoles() });
  }),
);

// Declared before any "/:id"-shaped route below so "accounts" is never mistaken
// for a role id (there is no GET "/:id" today, but this keeps it safe if one is
// ever added).
rolesRouter.get(
  "/accounts",
  asyncHandler(async (_req, res) => {
    res.json({ accounts: await listStaffAccounts() });
  }),
);

const createRoleSchema = z.object({
  label: z.string().min(2),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).default([]),
  name: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  message: z.string().optional(),
});

rolesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createRoleSchema.parse(req.body);
    const { role, profile, emailSent, emailError } = await createRole(body);
    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Rôle "${role.label}" créé`,
      source: "roles.routes",
      userId: req.user!.id,
    });
    res.status(201).json({ role, profile, emailSent, emailError });
  }),
);

const provisionAccountSchema = z.object({
  name: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  message: z.string().optional(),
});

rolesRouter.post(
  "/:id/accounts",
  asyncHandler(async (req, res) => {
    const body = provisionAccountSchema.parse(req.body);
    const { profile, emailSent, emailError } = await addStaffAccountToRole(req.params.id, body);
    res.status(201).json({ profile, emailSent, emailError });
  }),
);

const updatePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});

rolesRouter.patch(
  "/:id/permissions",
  asyncHandler(async (req, res) => {
    const body = updatePermissionsSchema.parse(req.body);
    const role = await updateRolePermissions(req.params.id, body.permissionKeys);
    await createPlatformLog({
      type: "security",
      level: "info",
      message: `Permissions du rôle "${role.label}" modifiées`,
      source: "roles.routes",
      userId: req.user!.id,
    });
    res.json({ role });
  }),
);

rolesRouter.delete(
  "/accounts/:id",
  asyncHandler(async (req, res) => {
    await deleteStaffAccount(req.params.id, req.user!.id);
    res.status(204).send();
  }),
);

rolesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteRole(req.params.id);
    await createPlatformLog({
      type: "security",
      level: "warning",
      message: `Rôle ${req.params.id} supprimé`,
      source: "roles.routes",
      userId: req.user!.id,
    });
    res.status(204).send();
  }),
);
