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
  autoTriage: true,
  enterpriseValidation: true,
  triageLimitHours: 48,
  aiSensitivity: 75,
  require2FA: false,
  ipWhitelisting: false,
  sessionTimeout: 60,
  passwordComplexity: "standard",
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

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SystemConfig>) => {
      const { config } = await apiFetch<{ config: Record<string, unknown> }>("/api/config", {
        method: "PATCH",
        body: data,
      });
      return mapConfig(config);
    },
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}
