const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const SESSION_KEY = "bugbounty_session";

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let currentSession: Session | null = loadSession();
let refreshPromise: Promise<Session | null> | null = null;

export function getSession() {
  return currentSession;
}

export function setSession(session: Session | null) {
  currentSession = session;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
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

async function refreshSession(): Promise<Session | null> {
  if (!currentSession?.refresh_token) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setSession(null);
          return null;
        }
        const body = await res.json();
        setSession(body.session);
        return body.session as Session;
      })
      .catch(() => {
        setSession(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Refreshes proactively when the access token is about to expire, so a request
// never has to eat a round-trip failure just to discover it needs a new token.
async function ensureFreshSession() {
  if (!currentSession) return null;
  const expiresInMs = currentSession.expires_at * 1000 - Date.now();
  if (expiresInMs < 60_000) return refreshSession();
  return currentSession;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  await ensureFreshSession();

  const doFetch = () => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (currentSession) headers.Authorization = `Bearer ${currentSession.access_token}`;

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && currentSession) {
    const refreshed = await refreshSession();
    if (refreshed) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Erreur ${res.status}`, payload?.details);
  }

  return payload as T;
}
