import { env } from "../env.js";
import { HttpError } from "../middleware/errorHandler.js";

// supabase-js's own GoTrueClient.auth.mfa.* methods only operate on whatever session
// is currently loaded into that client instance (via setSession, which needs a real
// refresh_token the backend never has — only the caller's access_token arrives on each
// request, see requireAuth). Rather than fighting that, this calls GoTrue's MFA REST
// endpoints directly with the caller's own access_token forwarded as Authorization —
// exactly what supabase-js does internally (verified against
// node_modules/@supabase/auth-js/dist/module/GoTrueClient.js: POST {url}/factors,
// POST {url}/factors/:id/challenge, POST {url}/factors/:id/verify, DELETE {url}/factors/:id).
// `apikey` uses the service-role key already held server-side — Kong accepts it like any
// valid project API key; it identifies the calling application, not the acting user
// (that's the Authorization header, carrying the real user's own token).
const AUTH_BASE = `${env.SUPABASE_URL}/auth/v1`;

async function gotrueRequest<T>(method: "GET" | "POST" | "DELETE", path: string, accessToken: string, body?: unknown): Promise<T> {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = (await res.json().catch(() => undefined)) as Record<string, unknown> | undefined;
  if (!res.ok) {
    const message = (payload?.msg ?? payload?.message ?? payload?.error_description) as string | undefined;
    throw new HttpError(res.status, message ?? "Erreur MFA");
  }
  return payload as T;
}

export interface EnrolledTotpFactor {
  id: string;
  type: "totp";
  totp: { qr_code: string; secret: string; uri: string };
  friendly_name?: string;
}

export async function enrollTotpFactor(accessToken: string, friendlyName: string): Promise<EnrolledTotpFactor> {
  const data = await gotrueRequest<EnrolledTotpFactor>("POST", "/factors", accessToken, {
    factor_type: "totp",
    friendly_name: friendlyName,
  });
  // GoTrue returns the raw SVG markup; supabase-js's own enroll() wrapper does this same
  // conversion so the value drops straight into an <img src>.
  return { ...data, totp: { ...data.totp, qr_code: `data:image/svg+xml;utf-8,${data.totp.qr_code}` } };
}

export interface MfaChallenge {
  id: string;
  expires_at: number;
}

export async function challengeFactor(accessToken: string, factorId: string): Promise<MfaChallenge> {
  return gotrueRequest<MfaChallenge>("POST", `/factors/${factorId}/challenge`, accessToken, {});
}

export interface MfaVerifyResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Success promotes the session behind accessToken to aal2 (and, per Supabase's own
// behavior, signs out every other session on the account) — the returned tokens are a
// brand new session the caller must adopt, not just a yes/no confirmation.
export async function verifyFactor(accessToken: string, factorId: string, challengeId: string, code: string): Promise<MfaVerifyResult> {
  return gotrueRequest<MfaVerifyResult>("POST", `/factors/${factorId}/verify`, accessToken, {
    challenge_id: challengeId,
    code,
  });
}

export async function unenrollFactor(accessToken: string, factorId: string): Promise<void> {
  await gotrueRequest<unknown>("DELETE", `/factors/${factorId}`, accessToken);
}
