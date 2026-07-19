import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface FundProgrammeInput {
  programmeId: string;
  method: "card" | "mobile_money";
  amount: number;
  currency?: "USD" | "EUR" | "XAF";
}

// Both return a hosted checkout URL to redirect the browser to (Stripe Checkout or
// CinetPay Checkout) — this app never handles card/mobile money details directly.
export function useFundProgramme() {
  return useMutation({
    mutationFn: async ({ programmeId, method, amount, currency = "XAF" }: FundProgrammeInput) => {
      const { redirectUrl } = await apiFetch<{ redirectUrl: string }>(`/api/payments/programmes/${programmeId}/fund`, {
        method: "POST",
        body: { method, amount, currency },
      });
      return redirectUrl;
    },
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      return apiFetch<{ payout: { id: string; status: string; provider: string; providerRef: string } }>(
        `/api/payouts/reports/${reportId}`,
        { method: "POST" },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}
