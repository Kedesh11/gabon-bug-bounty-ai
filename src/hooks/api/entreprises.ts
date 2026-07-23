import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { ApiEntrepriseProfile, mapEntreprise } from "@/lib/api/mappers";
import { EntrepriseProfile } from "@/types/domain";

const KEY = ["entreprises"] as const;

// Admin-only listing (mirrors the server-side RBAC on GET /api/entreprises).
export function useEntreprises(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { entreprises } = await apiFetch<{ entreprises: ApiEntrepriseProfile[] }>("/api/entreprises");
      return entreprises.map(mapEntreprise);
    },
    enabled,
  });
}

export function useEntreprise(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { entreprise } = await apiFetch<{ entreprise: ApiEntrepriseProfile }>(`/api/entreprises/${id}`);
      return mapEntreprise(entreprise);
    },
    enabled: !!id,
  });
}

export function useUpdateEntreprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntrepriseProfile> }) => {
      const { entreprise } = await apiFetch<{ entreprise: ApiEntrepriseProfile }>(`/api/entreprises/${id}`, {
        method: "PATCH",
        body: data,
      });
      return mapEntreprise(entreprise);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export interface TopResearcher {
  hacker: { id: string; name: string; reputation: number };
  reportsCount: number;
  totalReward: number;
}

// Real "Top Chercheurs" for this entreprise — grouped from actual accepted/resolved
// Report rows server-side, not a hardcoded [1,2,3] list. Deliberately a lighter shape
// than the full HackerProfile (no rank/badges/etc — this endpoint doesn't compute a
// rank, just a per-entreprise reward ranking).
export function useTopResearchers(entrepriseId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, entrepriseId, "top-researchers"],
    queryFn: async () => {
      const { researchers } = await apiFetch<{
        researchers: { hacker: { id: string; reputation: number; profile: { name: string } }; reportsCount: number; totalReward: number }[];
      }>(`/api/entreprises/${entrepriseId}/top-researchers`);
      return researchers.map((r): TopResearcher => ({
        hacker: { id: r.hacker.id, name: r.hacker.profile.name, reputation: r.hacker.reputation },
        reportsCount: r.reportsCount,
        totalReward: r.totalReward,
      }));
    },
    enabled: !!entrepriseId,
  });
}

export function useDeleteEntreprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/entreprises/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
