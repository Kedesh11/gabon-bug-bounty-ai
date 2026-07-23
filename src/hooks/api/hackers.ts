import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import {
  ApiHackerPaymentConfig,
  ApiHackerProfile,
  ApiHackerLeaderboardEntry,
  mapHacker,
  mapHackerLeaderboardEntry,
  mapPaymentConfig,
} from "@/lib/api/mappers";
import { HackerProfile, HackerPaymentConfig } from "@/types/domain";

const KEY = ["hackers"] as const;
const LEADERBOARD_KEY = ["hackers-leaderboard"] as const;
const PAYMENT_CONFIG_KEY = ["hacker-payment-config"] as const;

export function useHackers() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { hackers } = await apiFetch<{ hackers: ApiHackerProfile[] }>("/api/hackers");
      return hackers.map(mapHacker);
    },
  });
}

// Public, no auth required — rank is always computed server-side from reputation
// (see api/src/services/hackers/hackersService.ts), never hand-edited.
export function useHackerLeaderboard() {
  return useQuery({
    queryKey: LEADERBOARD_KEY,
    queryFn: async () => {
      const { hackers } = await apiFetch<{ hackers: ApiHackerLeaderboardEntry[] }>("/api/hackers/leaderboard");
      return hackers.map(mapHackerLeaderboardEntry);
    },
  });
}

export function useUpdateHacker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HackerProfile> }) => {
      const { hacker } = await apiFetch<{ hacker: ApiHackerProfile }>(`/api/hackers/${id}`, {
        method: "PATCH",
        body: data,
      });
      return mapHacker(hacker);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

// Self-service: a hacker editing their own specialties (name/email live on Profile, via
// useAuth().updateProfile — admin-only fields like reputation/status use useUpdateHacker).
export function useUpdateMyHacker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { specialties?: string[]; bio?: string; githubHandle?: string; twitterHandle?: string }) => {
      const { hacker } = await apiFetch<{ hacker: ApiHackerProfile }>("/api/hackers/me", {
        method: "PATCH",
        body: data,
      });
      return mapHacker(hacker);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteHacker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/hackers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMyPaymentConfig(enabled: boolean) {
  return useQuery({
    queryKey: PAYMENT_CONFIG_KEY,
    queryFn: async () => {
      const { config } = await apiFetch<{ config: ApiHackerPaymentConfig | null }>("/api/hackers/me/payment-config");
      return config ? mapPaymentConfig(config) : null;
    },
    enabled,
  });
}

// cardCvv is stripped before it ever leaves the browser and cardNumber is trimmed down to
// its last 4 digits — the API has no column for either the CVV or the full PAN (PCI).
export function useUpdateMyPaymentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: HackerPaymentConfig) => {
      const { cardNumber, cardCvv, ...rest } = config;
      const body = {
        ...rest,
        cardNumberLast4: cardNumber.replace(/\D/g, "").slice(-4) || undefined,
      };
      const { config: updated } = await apiFetch<{ config: ApiHackerPaymentConfig }>("/api/hackers/me/payment-config", {
        method: "PATCH",
        body,
      });
      return mapPaymentConfig(updated);
    },
    onSuccess: (data) => queryClient.setQueryData(PAYMENT_CONFIG_KEY, data),
  });
}

export function useStripeOnboarding() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await apiFetch<{ url: string }>("/api/payments/onboarding/stripe", { method: "POST" });
      return url;
    },
  });
}
