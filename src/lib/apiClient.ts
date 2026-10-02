const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
// The session itself (access + refresh token) lives only in httpOnly cookies set by the API —
// this code can't read it, and neither can an XSS payload. All that is kept client-side is a
// non-sensitive hint that a session probably exists, so a signed-out visitor doesn't trigger
// a pointless /me + refresh round trip on every page load.
const HINT_KEY = "bugbounty_session_hint";

// Added to every request: a cross-origin page can't send a custom header without a CORS
// preflight the API refuses, which is what makes cookie auth safe from CSRF (see
// api/src/middleware/csrf.ts).
const CSRF_HEADERS = { "X-Requested-With": "bb-web" };

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSessionHint(active: boolean) {
  try {
    if (active) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // Storage blocked: the app still works, it just probes /me on each load.
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Zod validation errors arrive as { error: "Requête invalide", details: { field: [msg] } } —
// surface the first field message when present, it's far more useful than the generic one.
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && typeof err.details === "object") {
      const firstField = Object.values(err.details as Record<string, string[]>).find(
        (value) => Array.isArray(value) && value.length > 0,
      );
      if (firstField) return firstField[0];
    }
    return err.message;
  }
  return "Une erreur inattendue est survenue";
}

let refreshPromise: Promise<boolean> | null = null;

// The refresh token rides in its own httpOnly cookie; the API answers with fresh cookies.
// Concurrent 401s share one refresh so the (rotating) refresh token is only used once.
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: "{}",
    })
      .then((res) => {
        if (!res.ok) setSessionHint(false);
        return res.ok;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const doFetch = () => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined), ...CSRF_HEADERS };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    return fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await doFetch();

  // The access cookie is short-lived: a 401 on a signed-in client is usually just that,
  // so refresh once and replay. Wrong credentials on /login never trigger this (no hint yet).
  if (res.status === 401 && hasSessionHint() && (await refreshSession())) {
    res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Erreur ${res.status}`, payload?.details);
  }

  return payload as T;
}

// Separate from apiFetch because file uploads need a FormData body with a
// browser-set multipart boundary — JSON.stringify-ing it would corrupt the file.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const doFetch = () => fetch(`${API_URL}${path}`, { method: "POST", credentials: "include", headers: CSRF_HEADERS, body: formData });

  let res = await doFetch();

  if (res.status === 401 && hasSessionHint() && (await refreshSession())) {
    res = await doFetch();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Erreur ${res.status}`, payload?.details);
  }

  return payload as T;
}
