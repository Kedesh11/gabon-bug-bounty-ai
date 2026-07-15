import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { mapConfig } from "@/lib/api/mappers";
import { SystemConfig } from "@/types/domain";

const KEY = ["config"] as const;

// Matches the backend's Prisma column defaults (api/prisma/schema.prisma SystemConfig) —
// used as a placeholder while the real config is loading, so pages can render immediately.
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  platformName: "Gabon Bug Bounty AI",
  contactEmail: "admin@bugbounty.ga",
  supportUrl: "https://support.bugbounty.ga",
  maintenanceMode: false,
  maintenanceUntil: null,
  autoTriage: true,
  enterpriseValidation: true,
  triageLimitHours: 48,
  aiSensitivity: 75,
  require2FA: false,
  ipWhitelisting: false,
  sessionTimeout: 60,
  passwordComplexity: "standard",
  globalNotificationsEnabled: true,
};

export function useConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { config } = await apiFetch<{ config: Record<string, unknown> }>("/api/config");
      return mapConfig(config);
    },
  });
}

interface UpdateConfigInput extends Partial<SystemConfig> {
  // Write-only: the server computes maintenanceUntil from this rather than trusting a
  // client-supplied timestamp. Only meaningful when maintenanceMode is set to true.
  maintenanceDurationHours?: number;
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateConfigInput) => {
      const { config } = await apiFetch<{ config: Record<string, unknown> }>("/api/config", {
        method: "PATCH",
        body: data,
      });
      return mapConfig(config);
    },
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}

interface MaintenanceStatus {
  active: boolean;
  maintenanceUntil: string | null;
}

// Deliberately hits a public, unauthenticated endpoint (api/src/routes/maintenance.routes.ts) —
// anonymous visitors and a not-yet-logged-in admin both need this before any session exists.
export function useMaintenanceStatus() {
  return useQuery({
    queryKey: ["maintenance-status"],
    queryFn: () => apiFetch<MaintenanceStatus>("/api/maintenance-status"),
    refetchInterval: 30_000,
  });
}
