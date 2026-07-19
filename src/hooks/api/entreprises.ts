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

export function useDeleteEntreprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/entreprises/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
