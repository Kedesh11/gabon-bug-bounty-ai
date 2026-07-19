import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { PlatformLog } from "@/types/domain";

export interface LogFilters {
  type?: PlatformLog["type"];
  level?: PlatformLog["level"];
  userId?: string;
  limit?: number;
}

const KEY = ["platform-logs"] as const;

export function useLogs(filters: LogFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.level) params.set("level", filters.level);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.limit) params.set("limit", String(filters.limit));
      const query = params.toString();
      const { logs } = await apiFetch<{ logs: PlatformLog[] }>(`/api/logs${query ? `?${query}` : ""}`);
      return logs;
    },
  });
}
