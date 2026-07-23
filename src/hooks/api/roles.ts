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

export interface StaffAccount {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  role: string;
  roleLabel: string;
  permissions: string[];
  lastLoginAt: string | null;
}

const STAFF_ACCOUNTS_KEY = ["staff-accounts"] as const;

// Every real staff account (admin/triage/finance/support/custom roles) — backs the
// "Équipe" tab. Distinct from useHackers/useEntreprises, which are self-service roles.
export function useStaffAccounts() {
  return useQuery({
    queryKey: STAFF_ACCOUNTS_KEY,
    queryFn: async () => {
      const { accounts } = await apiFetch<{ accounts: StaffAccount[] }>("/api/roles/accounts");
      return accounts;
    },
  });
}

export interface AddStaffAccountInput {
  roleId: string;
  name: string;
  email: string;
  password: string;
  message?: string;
}

export interface AddStaffAccountResult {
  profile: { id: string; email: string; name: string };
  emailSent: boolean;
  emailError?: string;
}

export function useAddStaffAccountToRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, ...body }: AddStaffAccountInput) => {
      return apiFetch<AddStaffAccountResult>(`/api/roles/${roleId}/accounts`, { method: "POST", body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_ACCOUNTS_KEY }),
  });
}

export function useDeleteStaffAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/roles/accounts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_ACCOUNTS_KEY }),
  });
}
