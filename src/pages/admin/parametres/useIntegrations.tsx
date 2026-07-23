import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface IntegrationsStatus {
  stripe: boolean;
  cinetpayCheckout: boolean;
  cinetpayTransfer: boolean;
  openrouter: boolean;
  resend: boolean;
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["config", "integrations"],
    queryFn: async () => {
      const { integrations } = await apiFetch<{ integrations: IntegrationsStatus }>("/api/config/integrations");
      return integrations;
    },
  });
}
