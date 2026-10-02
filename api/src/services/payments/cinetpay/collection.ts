import { cinetpayCheckoutRequest } from "./client.js";
import { env } from "../../../env.js";
import type { CollectionResult, CreateCollectionInput } from "../types.js";

interface CinetPayInitResponse {
  code: string;
  message: string;
  data?: {
    payment_token: string;
    payment_url: string;
  };
}

// CinetPay Checkout API — mobile money (and card) collection for an entreprise
// funding a programme. NOTE: field names below follow CinetPay's documented v2
// payment API (docs.cinetpay.com/api/1.0-en/checkout/initialisation); verify
// against a live sandbox once real CINETPAY_API_KEY/SITE_ID are available —
// this repo has none configured yet, so this path is only exercised by mocked
// tests so far.
export async function createCinetpayCollection(input: CreateCollectionInput): Promise<CollectionResult> {
  const response = await cinetpayCheckoutRequest<CinetPayInitResponse>("/payment", {
    transaction_id: input.paymentId,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    description: input.description,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    notify_url: `${env.API_BASE_URL}/api/webhooks/cinetpay`,
    return_url: input.successUrl,
    channels: "MOBILE_MONEY",
  });

  if (!response.data?.payment_url) {
    throw new Error(`CinetPay did not return a payment URL: ${response.message}`);
  }

  return { providerRef: input.paymentId, redirectUrl: response.data.payment_url };
}

interface CinetPayCheckResponse {
  code: string;
  message: string;
  data?: {
    // ACCEPTED / REFUSED are final; PENDING / INITIATED / UNKNOWN are not; EXPIRED and
    // CANCELLED mean the customer never paid.
    status: "ACCEPTED" | "REFUSED" | "CANCELLED" | "EXPIRED" | "PENDING" | "INITIATED" | string;
    amount?: string | number;
    currency?: string;
  };
}

export interface CinetpayCheckResult {
  status: "succeeded" | "failed" | "pending";
  // What CinetPay itself says was paid — compared against our Payment row by the webhook.
  amount: number | null;
  currency: string | null;
}

// CinetPay's notification POST body is NOT trustworthy on its own (no verifiable
// signature) — CinetPay's own docs say to always re-check the authoritative
// status via this endpoint before updating anything.
export async function checkCinetpayTransactionStatus(transactionId: string): Promise<CinetpayCheckResult> {
  const response = await cinetpayCheckoutRequest<CinetPayCheckResponse>("/payment/check", {
    transaction_id: transactionId,
  });

  const status = response.data?.status;
  const rawAmount = response.data?.amount;
  const amount = rawAmount === undefined || rawAmount === "" ? null : Number(rawAmount);
  const base = { amount: Number.isFinite(amount) ? amount : null, currency: response.data?.currency ?? null };

  if (status === "ACCEPTED") return { status: "succeeded", ...base };
  if (status === "REFUSED" || status === "CANCELLED" || status === "EXPIRED") return { status: "failed", ...base };
  return { status: "pending", ...base };
}
