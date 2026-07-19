import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export type ContentValueType = "text" | "json";

export interface ContentEntry {
  id: string;
  key: string;
  type: ContentValueType;
  value: string;
  updatedAt: string;
}

export interface NavbarItem {
  id: string;
  label: string;
  url: string;
  order: number;
  isExternal: boolean;
  visible: boolean;
}

export interface FooterLink {
  id: string;
  columnId: string;
  label: string;
  url: string;
  order: number;
}

export interface FooterColumn {
  id: string;
  title: string;
  order: number;
  links: FooterLink[];
}

const ENTRIES_KEY = ["content-entries"] as const;
const NAVBAR_KEY = ["navbar-items"] as const;
const NAVBAR_ALL_KEY = ["navbar-items", "all"] as const;
const FOOTER_KEY = ["footer-columns"] as const;

// ---------------------------------------------------------------------------
// Content entries — public read, long staleTime since content changes rarely.
// ---------------------------------------------------------------------------

export function useContentEntries() {
  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: async () => {
      const { entries } = await apiFetch<{ entries: ContentEntry[] }>("/api/content/entries");
      return entries;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Read a single text entry with a safe fallback to today's hardcoded copy — a page
// migrating to the CMS just wraps its literal string in this hook; nothing breaks
// until an admin actually sets that key from /admin/contenu.
export function useContent(key: string, fallback: string): string {
  const { data: entries } = useContentEntries();
  const entry = entries?.find((e) => e.key === key);
  return entry?.type === "text" ? entry.value : fallback;
}

// Same idea for structured (type=json) content — parse failures fall back too, so a
// malformed value can never break the page it feeds.
export function useJsonContent<T>(key: string, fallback: T): T {
  const { data: entries } = useContentEntries();
  const entry = entries?.find((e) => e.key === key);
  if (entry?.type !== "json") return fallback;
  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return fallback;
  }
}

export function useUpsertContentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; type: ContentValueType; value: string }) => {
      const { entry } = await apiFetch<{ entry: ContentEntry }>("/api/content/entries", { method: "PUT", body: input });
      return entry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENTRIES_KEY }),
  });
}

export function useDeleteContentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/content/entries/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENTRIES_KEY }),
  });
}

// ---------------------------------------------------------------------------
// Navbar items
// ---------------------------------------------------------------------------

// Public: visible items only, consumed by the real Navbar component.
export function useNavbarItems() {
  return useQuery({
    queryKey: NAVBAR_KEY,
    queryFn: async () => {
      const { items } = await apiFetch<{ items: NavbarItem[] }>("/api/content/navbar-items");
      return items;
    },
  });
}

// Admin: includes hidden items, for the editor.
export function useAllNavbarItems() {
  return useQuery({
    queryKey: NAVBAR_ALL_KEY,
    queryFn: async () => {
      const { items } = await apiFetch<{ items: NavbarItem[] }>("/api/content/navbar-items/all");
      return items;
    },
  });
}

function invalidateNavbar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: NAVBAR_KEY });
  queryClient.invalidateQueries({ queryKey: NAVBAR_ALL_KEY });
}

export function useCreateNavbarItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; url: string; isExternal?: boolean; visible?: boolean }) => {
      const { item } = await apiFetch<{ item: NavbarItem }>("/api/content/navbar-items", { method: "POST", body: input });
      return item;
    },
    onSuccess: () => invalidateNavbar(queryClient),
  });
}

export function useUpdateNavbarItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<NavbarItem, "label" | "url" | "isExternal" | "visible">> }) => {
      const { item } = await apiFetch<{ item: NavbarItem }>(`/api/content/navbar-items/${id}`, { method: "PATCH", body: data });
      return item;
    },
    onSuccess: () => invalidateNavbar(queryClient),
  });
}

export function useDeleteNavbarItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/content/navbar-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => invalidateNavbar(queryClient),
  });
}

export function useReorderNavbarItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { items } = await apiFetch<{ items: NavbarItem[] }>("/api/content/navbar-items/reorder", { method: "POST", body: { ids } });
      return items;
    },
    onSuccess: () => invalidateNavbar(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Footer columns + links
// ---------------------------------------------------------------------------

export function useFooterColumns() {
  return useQuery({
    queryKey: FOOTER_KEY,
    queryFn: async () => {
      const { columns } = await apiFetch<{ columns: FooterColumn[] }>("/api/content/footer-columns");
      return columns;
    },
  });
}

export function useCreateFooterColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { column } = await apiFetch<{ column: FooterColumn }>("/api/content/footer-columns", { method: "POST", body: { title } });
      return column;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useUpdateFooterColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { column } = await apiFetch<{ column: FooterColumn }>(`/api/content/footer-columns/${id}`, { method: "PATCH", body: { title } });
      return column;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useDeleteFooterColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/content/footer-columns/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useReorderFooterColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { columns } = await apiFetch<{ columns: FooterColumn[] }>("/api/content/footer-columns/reorder", { method: "POST", body: { ids } });
      return columns;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useCreateFooterLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { columnId: string; label: string; url: string }) => {
      const { link } = await apiFetch<{ link: FooterLink }>("/api/content/footer-links", { method: "POST", body: input });
      return link;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useUpdateFooterLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<FooterLink, "label" | "url">> }) => {
      const { link } = await apiFetch<{ link: FooterLink }>(`/api/content/footer-links/${id}`, { method: "PATCH", body: data });
      return link;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useDeleteFooterLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/content/footer-links/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}

export function useReorderFooterLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, ids }: { columnId: string; ids: string[] }) => {
      const { columns } = await apiFetch<{ columns: FooterColumn[] }>("/api/content/footer-links/reorder", {
        method: "POST",
        body: { columnId, ids },
      });
      return columns;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOOTER_KEY }),
  });
}
