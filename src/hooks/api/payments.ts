import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Payment {
  id: string;
  programmeId: string;
  programme: { id: string; name: string };
  entrepriseId: string;
  entreprise: { profile: { name: string } };
  provider: "stripe" | "cinetpay";
  status: "pending" | "succeeded" | "failed";
  amount: number;
  currency: string;
  providerRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  reportId: string;
  report: { id: string; title: string; programmeId: string; programme: { id: string; name: string } };
  hackerId: string;
  hacker: { profile: { name: string } };
  provider: "stripe" | "cinetpay";
  status: "pending" | "succeeded" | "failed";
  amount: number;
  currency: string;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
}

// Real transaction ledger for the finance dashboard — money in (Payment) and money
// out (Payout). Gated by dashboard.finance.view on the backend (same permission
// that already gates seeing the page these feed).
export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { payments } = await apiFetch<{ payments: Payment[] }>("/api/payments");
      return payments;
    },
  });
}

export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { payouts } = await apiFetch<{ payouts: Payout[] }>("/api/payouts");
      return payouts;
    },
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}
