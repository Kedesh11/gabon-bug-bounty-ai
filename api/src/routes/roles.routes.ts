import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { listPermissions, listRoles, createRole, updateRolePermissions, deleteRole } from "../services/roles/rolesService.js";

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

const createRoleSchema = z.object({
  label: z.string().min(2),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).default([]),
});

rolesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createRoleSchema.parse(req.body);
    const role = await createRole(body);
    res.status(201).json({ role });
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
    res.json({ role });
  }),
);

rolesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteRole(req.params.id);
    res.status(204).send();
  }),
);
