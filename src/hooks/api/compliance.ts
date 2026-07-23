import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface ComplianceItem {
  id: string;
  label: string;
  isDone: boolean;
  completedById: string | null;
  completedBy: { id: string; name: string; email: string } | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const KEY = ["compliance-items"] as const;

export function useComplianceItems() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { items } = await apiFetch<{ items: ComplianceItem[] }>("/api/compliance/items");
      return items;
    },
  });
}

export function useCreateComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: string) => {
      const { item } = await apiFetch<{ item: ComplianceItem }>("/api/compliance/items", { method: "POST", body: { label } });
      return item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isDone }: { id: string; isDone: boolean }) => {
      const { item } = await apiFetch<{ item: ComplianceItem }>(`/api/compliance/items/${id}`, { method: "PATCH", body: { isDone } });
      return item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/compliance/items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
