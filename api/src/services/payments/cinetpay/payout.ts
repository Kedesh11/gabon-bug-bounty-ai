import { env } from "../../../env.js";
import { cinetpayTransferRequest } from "./client.js";
import { clientTransactionId, mapTreatmentStatus } from "./transferStatus.js";
import type { CinetPayPayoutInput, PayoutResult } from "../types.js";

interface CinetPayGenericResponse {
  code: number | string;
  message: string;
  data?: Record<string, unknown>;
}

function splitPhoneNumber(phoneNumber: string): { prefix: string; number: string } {
  const digits = phoneNumber.replace(/\D/g, "");
  return { prefix: digits.slice(0, 3), number: digits.slice(3) };
}

// Recipients must exist in the CinetPay contact list before money can be sent to
// them — this call is idempotent per phone number on CinetPay's side, so it's
// safe to call before every payout rather than caching contact state locally.
async function ensureContact(hackerName: string, phoneNumber: string): Promise<void> {
  const { prefix, number } = splitPhoneNumber(phoneNumber);
  await cinetpayTransferRequest<CinetPayGenericResponse>("/transfer/contact", {
    prefix,
    phone: number,
    name: hackerName.split(" ")[0] ?? hackerName,
    surname: hackerName.split(" ").slice(1).join(" ") || hackerName,
  });
}

// CinetPay only accepts amounts that are a multiple of 5 for a transfer.
export const CINETPAY_TRANSFER_STEP = 5;

// A mobile-money transfer is asynchronous: code 0 means CinetPay ACCEPTED the order (it comes
// back as treatment_status NEW), not that the money arrived. So this returns "pending" and the
// outcome is settled later by the notify_url callback or the reconciliation job (see
// services/payments/cinetpay/payoutSync.ts) — never assumed here.
export async function createCinetpayPayout(input: CinetPayPayoutInput): Promise<PayoutResult> {
  await ensureContact(input.hackerName, input.phoneNumber);
  const { prefix, number } = splitPhoneNumber(input.phoneNumber);
  const clientTxId = clientTransactionId(input.payoutId, input.attempt ?? 1);

  const response = await cinetpayTransferRequest<CinetPayGenericResponse>("/transfer/money/send/contact", {
    prefix,
    phone: number,
    amount: input.amount,
    notify_url: `${env.API_BASE_URL}/api/webhooks/cinetpay-transfer`,
    client_transaction_id: clientTxId,
  });

  if (Number(response.code) !== 0) {
    throw new Error(`CinetPay payout failed: ${response.message}`);
  }

  const outcome = mapTreatmentStatus(response.data?.treatment_status);
  if (outcome === "failed") {
    throw new Error(`CinetPay a rejeté le transfert (${String(response.data?.treatment_status)})`);
  }

  const providerRef = typeof response.data?.transaction_id === "string" ? response.data.transaction_id : clientTxId;
  return { providerRef, status: outcome };
}
