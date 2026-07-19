import { cinetpayTransferRequest } from "./client.js";
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

export async function createCinetpayPayout(input: CinetPayPayoutInput): Promise<PayoutResult> {
  await ensureContact(input.hackerName, input.phoneNumber);
  const { prefix, number } = splitPhoneNumber(input.phoneNumber);

  const response = await cinetpayTransferRequest<CinetPayGenericResponse>("/transfer/money/send/contact", {
    prefix,
    phone: number,
    amount: input.amount,
    notify_url: "",
    client_transaction_id: input.payoutId,
  });

  if (Number(response.code) !== 0) {
    throw new Error(`CinetPay payout failed: ${response.message}`);
  }

  return { providerRef: input.payoutId };
}
