import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export type FraudSignalType =
  | "duplicate_account"
  | "hacker_entreprise_collusion"
  | "plagiarized_report"
  | "payment_anomaly"
  // Raised by the MCP anti-fraud agent (services/mcpAgents) — semantic detection,
  // complements plagiarized_report's exact/near-exact Jaccard check.
  | "llm_semantic_anomaly";
export type FraudSignalStatus = "open" | "reviewing" | "confirmed" | "dismissed";

export interface FraudSignal {
  id: string;
  type: FraudSignalType;
  status: FraudSignalStatus;
  severity: string;
  summary: string;
  details: Record<string, unknown>;
  relatedProfileIds: string[];
  relatedReportId: string | null;
  relatedPaymentId: string | null;
  relatedPayoutId: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const KEY = ["fraud-signals"] as const;

export function useFraudSignals(filters: { status?: FraudSignalStatus; type?: FraudSignalType } = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      const qs = params.toString();
      const { signals } = await apiFetch<{ signals: FraudSignal[] }>(`/api/fraud/signals${qs ? `?${qs}` : ""}`);
      return signals;
    },
  });
}

export function useRunFraudScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ created: number; signals: FraudSignal[] }>("/api/fraud/scan", { method: "POST" });
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFraudSignalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FraudSignalStatus }) => {
      const { signal } = await apiFetch<{ signal: FraudSignal }>(`/api/fraud/signals/${id}`, {
        method: "PATCH",
        body: { status },
      });
      return signal;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
