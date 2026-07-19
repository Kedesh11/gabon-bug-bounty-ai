import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export type ServiceStatus = "online" | "offline";

export interface SystemStatus {
  database: ServiceStatus;
  auth: ServiceStatus;
  payments: ServiceStatus;
  uptimeSeconds: number;
}

// Admin-only (api/src/routes/systemStatus.routes.ts) — each field is a real, live
// dependency check (DB query, Supabase Auth call, Stripe call), not a stored flag.
export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () => apiFetch<SystemStatus>("/api/system-status"),
    refetchInterval: 30_000,
  });
}
