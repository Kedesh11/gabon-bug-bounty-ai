import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface McpAgentStats {
  totalRuns: number;
  totalOutputs: number;
  completedOutputs: number;
  completionRate: number | null;
}

// Public, no auth required — real counts for the marketing page (src/pages/MCPAgents.tsx).
export function useMcpAgentStats() {
  return useQuery({
    queryKey: ["mcp-agents-stats"],
    queryFn: () => apiFetch<McpAgentStats>("/api/mcp-agents/stats"),
  });
}
