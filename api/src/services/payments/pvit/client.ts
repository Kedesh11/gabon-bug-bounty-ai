import { env } from "../../../env.js";

// PVit (https://docs.mypvit.pro) authenticates every call with an `X-Secret` key that expires
// after one hour and is obtained from the Renew Secret API with the account code + password.
// Cached in memory and renewed a minute before it lapses; concurrent callers share one renewal.
const REQUEST_TIMEOUT_MS = 20_000;
const RENEW_MARGIN_MS = 60_000;

function requireSetting(name: string, value: string): string {
  if (!value) throw new Error(`PVit non configuré (${name} manquant) — voir api/.env.example`);
  return value;
}

let cached: { secret: string; expiresAt: number } | null = null;
let renewing: Promise<string> | null = null;

interface RenewResponse {
  secret?: string;
  expires_in?: number;
}

async function renewSecret(): Promise<string> {
  const url = requireSetting("PVIT_RENEW_SECRET_URL", env.PVIT_RENEW_SECRET_URL);
  const operationAccountCode = requireSetting("PVIT_OPERATION_ACCOUNT_CODE", env.PVIT_OPERATION_ACCOUNT_CODE);
  const password = requireSetting("PVIT_SECRET_PASSWORD", env.PVIT_SECRET_PASSWORD);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ operationAccountCode, password }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as RenewResponse;

  // The response body is never echoed into the error: it carries the secret on success.
  if (!res.ok || !json.secret) throw new Error(`PVit: échec du renouvellement de la clé secrète (HTTP ${res.status})`);

  cached = { secret: json.secret, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - RENEW_MARGIN_MS };
  return json.secret;
}

async function getSecret(forceRenew = false): Promise<string> {
  if (!forceRenew && cached && cached.expiresAt > Date.now()) return cached.secret;
  renewing ??= renewSecret().finally(() => {
    renewing = null;
  });
  return renewing;
}

// For tests: forget the cached key so each test starts from a cold state.
export function resetPvitSecretCache() {
  cached = null;
  renewing = null;
}

// Raised for a request we KNOW went nowhere: our own validation (unsupported operator, bad
// number, non-XAF) or PVit answering FAILED / 4xx. Contrast with a timeout or 5xx, where the
// transaction may or may not exist — see isDefinitiveRefusal.
export class PvitRefusedError extends Error {}

export class PvitHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
  }
}

// One authenticated call. A 401/403 usually means the key lapsed early or was rotated, so the
// key is renewed once and the call replayed before giving up. Non-2xx answers are thrown as
// PvitHttpError so callers can tell "PVit refused this" (4xx) from "we don't know" (network/5xx).
export async function pvitRequest<T>(
  method: "GET" | "POST",
  url: string,
  options: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(options.query ?? {})) target.searchParams.set(key, value);

  const attempt = async (secret: string) =>
    fetch(target, {
      method,
      headers: {
        "X-Secret": secret,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  let res = await attempt(await getSecret());
  if (res.status === 401 || res.status === 403) res = await attempt(await getSecret(true));

  const json = (await res.json().catch(() => undefined)) as T | undefined;
  if (!res.ok) {
    throw new PvitHttpError(res.status, `PVit a répondu HTTP ${res.status} sur ${target.pathname}`, json);
  }
  return json as T;
}

export function pvitUrl(name: "PVIT_PAYMENT_URL" | "PVIT_STATUS_URL" | "PVIT_BALANCE_URL"): string {
  return requireSetting(name, env[name]);
}

export function pvitOperationAccountCode(): string {
  return requireSetting("PVIT_OPERATION_ACCOUNT_CODE", env.PVIT_OPERATION_ACCOUNT_CODE);
}

export function pvitCallbackUrlCode(): string {
  return requireSetting("PVIT_CALLBACK_URL_CODE", env.PVIT_CALLBACK_URL_CODE);
}

// True when everything a PVit call needs is configured — lets routes answer a clean 503 up
// front instead of creating a payment/payout row that is bound to fail.
export function isPvitConfigured(): boolean {
  return Boolean(
    env.PVIT_OPERATION_ACCOUNT_CODE &&
      env.PVIT_SECRET_PASSWORD &&
      env.PVIT_RENEW_SECRET_URL &&
      env.PVIT_PAYMENT_URL &&
      env.PVIT_STATUS_URL &&
      env.PVIT_CALLBACK_URL_CODE,
  );
}
