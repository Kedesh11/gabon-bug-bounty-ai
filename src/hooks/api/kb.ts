import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface KbArticle {
  id: string;
  title: string;
  category: string;
  body: string;
  authorId: string;
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

const KEY = ["kb-articles"] as const;

export function useKbArticles() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { articles } = await apiFetch<{ articles: KbArticle[] }>("/api/kb/articles");
      return articles;
    },
  });
}

export interface KbArticleInput {
  title: string;
  category: string;
  body: string;
}

export function useCreateKbArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: KbArticleInput) => {
      const { article } = await apiFetch<{ article: KbArticle }>("/api/kb/articles", { method: "POST", body: input });
      return article;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateKbArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<KbArticleInput> & { id: string }) => {
      const { article } = await apiFetch<{ article: KbArticle }>(`/api/kb/articles/${id}`, { method: "PATCH", body: input });
      return article;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteKbArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/kb/articles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
