import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface MfaStatus {
  enrolled: boolean;
  factorId: string | null;
}

const KEY = ["mfa-status"] as const;

export function useMfaStatus() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<MfaStatus>("/api/auth/mfa/status"),
  });
}

export interface MfaEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

// Deliberately doesn't invalidate mfa-status: enrolling only creates an *unverified*
// factor, which /status ignores (it only ever reports a verified one) — nothing to
// refetch until AuthContext.confirmMfaEnrollment actually confirms it.
export function useEnrollMfa() {
  return useMutation({
    mutationFn: () => apiFetch<MfaEnrollment>("/api/auth/mfa/enroll", { method: "POST" }),
  });
}

export function useUnenrollMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (factorId: string) => apiFetch(`/api/auth/mfa/factors/${factorId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
