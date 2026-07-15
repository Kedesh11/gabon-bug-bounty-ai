import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { ApiReport, mapReport } from "@/lib/api/mappers";
import { REPORT_STATUS_TO_API } from "@/lib/api/enumMaps";
import { Report } from "@/types/domain";

const KEY = ["reports"] as const;

// GET /api/reports is already scoped server-side by role (a hacker only sees their own,
// an entreprise only sees reports on their programmes, admin/triage/finance/support see all)
// so this single hook is correct for every dashboard without any client-side filtering.
export function useReports() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { reports } = await apiFetch<{ reports: ApiReport[] }>("/api/reports");
      return reports.map(mapReport);
    },
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

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/reports/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
