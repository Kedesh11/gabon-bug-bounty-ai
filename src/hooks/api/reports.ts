import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUpload } from "@/lib/apiClient";
import { ApiReport, mapReport } from "@/lib/api/mappers";
import { REPORT_STATUS_TO_API } from "@/lib/api/enumMaps";
import { Report } from "@/types/domain";

const KEY = ["reports"] as const;

// GET /api/reports is already scoped server-side by role (a hacker only sees their own,
// an entreprise only sees reports on their programmes, admin/triage/finance/support see all)
// so this single hook is correct for every dashboard without any client-side filtering.
// refetchInterval lets a caller (AdminRapports.tsx) poll while a report's MCP analysis
// is still running, without turning on polling for every other consumer of this hook.
export function useReports(options: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { reports } = await apiFetch<{ reports: ApiReport[] }>("/api/reports");
      return reports.map(mapReport);
    },
    refetchInterval: options.refetchInterval,
  });
}

export interface CreateReportInput {
  title: string;
  description: string;
  severity: Report["severity"];
  programmeId: string;
  vulnerability: string;
  vrtCategory?: string;
  vrtType?: string;
  proof: string;
  pdfFileName?: string;
  vulnerabilityCategoryId?: string;
  affectedAsset?: string;
  stepsToReproduce?: string;
  impact?: string;
  remediation?: string;
  cvssVector?: string;
  cvssScore?: number;
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const { report } = await apiFetch<{ report: ApiReport }>("/api/reports", { method: "POST", body: input });
      return mapReport(report);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export interface UpdateReportInput {
  status?: Report["status"];
  severity?: Report["severity"];
  reward?: number;
  analysisStatus?: Report["analysisStatus"];
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateReportInput }) => {
      const body: Record<string, unknown> = { ...data };
      if (data.status) body.status = REPORT_STATUS_TO_API[data.status];
      const { report } = await apiFetch<{ report: ApiReport }>(`/api/reports/${id}`, { method: "PATCH", body });
      return mapReport(report);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

// Actually sends the hacker's PDF write-up bytes, not just its filename — see
// api/src/services/reports/reportStorage.ts. Kept as a second step after
// useCreateReport (which only needs the report id) rather than a single multipart
// request, so the JSON creation contract stays simple and independently testable.
export function useUploadReportPdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, file }: { reportId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { report } = await apiUpload<{ report: ApiReport }>(`/api/reports/${reportId}/pdf`, formData);
      return mapReport(report);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

// Suggestion-only, human-triggered re-run of the 7-agent MCP pipeline (see
// api/src/services/mcpAgents) — e.g. after a failed run or a report edit. Fires
// fire-and-forget server-side (202 response), so this just kicks it off; the caller
// polls via useReports({ refetchInterval }) to see results land.
export function useRunMcpAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      await apiFetch<{ started: boolean }>(`/api/reports/${reportId}/mcp-analysis`, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/reports/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
