import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, apiUpload, apiErrorMessage } from "@/lib/apiClient";

export type KycDocumentType = "passeport_recto" | "passeport_verso" | "justificatif_domicile" | "photo_identite";
export type KycDocumentStatus = "en_attente" | "valide" | "rejete";

export interface KycDocumentParty {
  id: string;
  name: string;
  email: string;
}

export interface KycDocument {
  id: string;
  type: KycDocumentType;
  status: KycDocumentStatus;
  subjectId: string;
  subject: KycDocumentParty;
  fileName: string | null;
  // Whether a real file is stored. Only documents with one can be approved.
  hasFile: boolean;
  reviewedById: string | null;
  reviewedBy: KycDocumentParty | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const KEY = ["kyc-documents"] as const;

export function useKycDocuments(filters: { subjectId?: string; status?: KycDocumentStatus } = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      if (filters.status) params.set("status", filters.status);
      const qs = params.toString();
      const { documents } = await apiFetch<{ documents: KycDocument[] }>(`/api/kyc/documents${qs ? `?${qs}` : ""}`);
      return documents;
    },
  });
}

export function useMyKycDocuments() {
  return useQuery({
    queryKey: [...KEY, "mine"],
    queryFn: async () => {
      const { documents } = await apiFetch<{ documents: KycDocument[] }>("/api/kyc/documents/mine");
      return documents;
    },
  });
}

export function useSubmitKycDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: KycDocumentType; fileName?: string }) => {
      const { document } = await apiFetch<{ document: KycDocument }>("/api/kyc/documents", { method: "POST", body: input });
      return document;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUploadKycDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, file }: { type: KycDocumentType; file: File }) => {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);
      const { document } = await apiUpload<{ document: KycDocument }>("/api/kyc/documents/upload", formData);
      return document;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

// Signed URLs last 5 minutes, so the link is fetched on click rather than cached.
export async function openKycFile(documentId: string) {
  try {
    const { url } = await apiFetch<{ url: string }>(`/api/kyc/documents/${documentId}/file`);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error(apiErrorMessage(err));
  }
}

export function useReviewKycDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: string; status: Extract<KycDocumentStatus, "valide" | "rejete">; reviewNote?: string }) => {
      const { document } = await apiFetch<{ document: KycDocument }>(`/api/kyc/documents/${id}`, {
        method: "PATCH",
        body: { status, reviewNote },
      });
      return document;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
