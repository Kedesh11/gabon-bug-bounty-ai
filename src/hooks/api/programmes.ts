import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { ApiProgramme, mapProgramme } from "@/lib/api/mappers";
import { PROGRAMME_STATUS_TO_API } from "@/lib/api/enumMaps";
import { Programme } from "@/types/domain";

const KEY = ["programmes"] as const;

export function useProgrammes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { programmes } = await apiFetch<{ programmes: ApiProgramme[] }>("/api/programmes");
      return programmes.map(mapProgramme);
    },
  });
}

// An entreprise's own programmes, every validation status included — the public
// GET /api/programmes only ever returns "valide" ones.
export function useMyProgrammes() {
  return useQuery({
    queryKey: [...KEY, "mine"],
    queryFn: async () => {
      const { programmes } = await apiFetch<{ programmes: ApiProgramme[] }>("/api/programmes/mine");
      return programmes.map(mapProgramme);
    },
  });
}

export function useProgrammesForReview(filters: { validationStatus?: "en_attente" | "valide" | "refuse" } = {}) {
  return useQuery({
    queryKey: [...KEY, "review", filters],
    queryFn: async () => {
      const params = filters.validationStatus ? `?validationStatus=${filters.validationStatus}` : "";
      const { programmes } = await apiFetch<{ programmes: ApiProgramme[] }>(`/api/programmes/review${params}`);
      return programmes.map(mapProgramme);
    },
  });
}

export function useValidateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, rejectionReason }: { id: string; decision: "valide" | "refuse"; rejectionReason?: string }) => {
      const { programme } = await apiFetch<{ programme: ApiProgramme }>(`/api/programmes/${id}/validation`, {
        method: "PATCH",
        body: { decision, rejectionReason },
      });
      return mapProgramme(programme);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useProgramme(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { programme } = await apiFetch<{ programme: ApiProgramme }>(`/api/programmes/${id}`);
      return mapProgramme(programme);
    },
    enabled: !!id,
  });
}

function toApiBody(data: Partial<Programme>) {
  const body: Record<string, unknown> = { ...data };
  if (data.status) body.status = PROGRAMME_STATUS_TO_API[data.status];
  return body;
}

export function useCreateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Programme>) => {
      const { programme } = await apiFetch<{ programme: ApiProgramme }>("/api/programmes", {
        method: "POST",
        body: toApiBody(input),
      });
      return mapProgramme(programme);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Programme> }) => {
      const { programme } = await apiFetch<{ programme: ApiProgramme }>(`/api/programmes/${id}`, {
        method: "PATCH",
        body: toApiBody(data),
      });
      return mapProgramme(programme);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/programmes/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
