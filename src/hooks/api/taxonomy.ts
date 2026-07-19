import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface VulnerabilityCategory {
  id: string;
  key: string;
  name: string;
  cweId: string | null;
  defaultSeverity: string | null;
  description: string | null;
  parentId: string | null;
}

const KEY = ["vulnerability-categories"] as const;

// Public endpoint, fixed/code-defined catalog — safe to fetch before auth resolves
// (needed on the report submission form).
export function useVulnerabilityCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { categories } = await apiFetch<{ categories: VulnerabilityCategory[] }>("/api/taxonomy/vulnerability-categories");
      return categories;
    },
    staleTime: Infinity,
  });
}
