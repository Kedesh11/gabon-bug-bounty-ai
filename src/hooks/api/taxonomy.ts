import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface VulnerabilityCategory {
  id: string;
  key: string;
  name: string;
  cweId: string | null;
  defaultSeverity: string | null;
  description: string | null;
  parentId: string | null;
  isSystem: boolean;
}

const KEY = ["vulnerability-categories"] as const;

// Public endpoint — mostly the curated catalog, plus whatever hackers have proposed
// (see useProposeVulnerabilityCategory). staleTime is long since it changes rarely,
// but a successful proposal still invalidates it immediately below.
export function useVulnerabilityCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { categories } = await apiFetch<{ categories: VulnerabilityCategory[] }>("/api/taxonomy/vulnerability-categories");
      return categories;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// No moderation queue: the server's automatic duplicate check either reuses an
// existing close-match category (reused: true) or creates a brand-new one — either
// way the returned category is immediately usable in the report form.
export function useProposeVulnerabilityCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return apiFetch<{ category: VulnerabilityCategory; reused: boolean }>("/api/taxonomy/vulnerability-categories", {
        method: "POST",
        body: { name },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
