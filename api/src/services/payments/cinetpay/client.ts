import { env } from "../../../env.js";

const CHECKOUT_BASE = "https://api-checkout.cinetpay.com/v2";
const TRANSFER_BASE = "https://client.cinetpay.com/v1";

function requireCheckoutCredentials() {
  if (!env.CINETPAY_API_KEY || !env.CINETPAY_SITE_ID) {
    throw new Error(
      "CinetPay non configuré (CINETPAY_API_KEY / CINETPAY_SITE_ID manquants) — voir api/.env.example",
    );
  }
  return { apikey: env.CINETPAY_API_KEY, site_id: env.CINETPAY_SITE_ID };
}

function requireTransferCredentials() {
  if (!env.CINETPAY_TRANSFER_LOGIN || !env.CINETPAY_TRANSFER_PASSWORD) {
    throw new Error(
      "CinetPay Transfer non configuré (CINETPAY_TRANSFER_LOGIN / CINETPAY_TRANSFER_PASSWORD manquants) — voir api/.env.example",
    );
  }
  return { login: env.CINETPAY_TRANSFER_LOGIN, password: env.CINETPAY_TRANSFER_PASSWORD };
}

export async function cinetpayCheckoutRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const credentials = requireCheckoutCredentials();
  const res = await fetch(`${CHECKOUT_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credentials, ...body }),
  });

  const json = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`CinetPay checkout error on ${path}: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

// CinetPay Transfer API uses a separate login/password → bearer-token flow from
// the Checkout API. Tokens aren't cached across calls (payouts are an infrequent,
// admin-triggered action) — a fresh token per payout keeps this simple and avoids
// dealing with an undocumented expiry window.
async function getTransferToken(): Promise<string> {
  const credentials = requireTransferCredentials();
  const res = await fetch(`${TRANSFER_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(credentials),
  });

  const json = (await res.json()) as { code: number; message: string; data?: { token: string } };
  if (!res.ok || !json.data?.token) {
    throw new Error(`CinetPay transfer auth failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data.token;
}

export async function cinetpayTransferRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getTransferToken();
  const res = await fetch(`${TRANSFER_BASE}${path}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body as Record<string, string>),
  });

  const json = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`CinetPay transfer error on ${path}: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

export { CHECKOUT_BASE };
