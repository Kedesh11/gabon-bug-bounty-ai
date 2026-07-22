import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export interface RoleDef {
  id: string;
  key: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

const ROLES_KEY = ["roles"] as const;
const PERMISSIONS_KEY = ["permissions"] as const;

export function usePermissionCatalog() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: async () => {
      const { permissions } = await apiFetch<{ permissions: PermissionDef[] }>("/api/roles/permissions");
      return permissions;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const { roles } = await apiFetch<{ roles: RoleDef[] }>("/api/roles");
      return roles;
    },
  });
}

export interface CreateRoleInput {
  label: string;
  description?: string;
  permissionKeys: string[];
  name: string;
  email: string;
  password: string;
  message?: string;
}

export interface CreateRoleResult {
  role: RoleDef;
  profile: { id: string; email: string; name: string };
  emailSent: boolean;
  emailError?: string;
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      return apiFetch<CreateRoleResult>("/api/roles", { method: "POST", body: input });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, permissionKeys }: { id: string; permissionKeys: string[] }) => {
      const { role } = await apiFetch<{ role: RoleDef }>(`/api/roles/${id}/permissions`, {
        method: "PATCH",
        body: { permissionKeys },
      });
      return role;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}
