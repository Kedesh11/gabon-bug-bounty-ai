import { pvitCallbackUrlCode, pvitOperationAccountCode, pvitRequest, pvitUrl, PvitHttpError, PvitRefusedError } from "./client.js";
import { mapPvitStatus, type PvitOutcome } from "./status.js";
import type { PvitOperator } from "./identifiers.js";

interface TransactionResponse {
  status?: string;
  status_code?: string;
  reference_id?: string;
  merchant_reference_id?: string;
  message?: string;
}

export interface PvitInitResult {
  // PVit's own id for the transaction — what its status API is queried with.
  transactionId: string | null;
  outcome: PvitOutcome;
}

interface TransactionInput {
  type: "PAYMENT" | "GIVE_CHANGE";
  reference: string;
  amount: number;
  msisdn: string;
  operator: PvitOperator;
  // Who bears the PVit commission / the operator's fee: the customer pays them ON TOP of the
  // amount, the merchant has them deducted from its operation account.
  chargeOwner: "CUSTOMER" | "MERCHANT";
  // Short labels (PVit caps these at 15 characters).
  product: string;
  freeInfo: string;
}

async function submit(input: TransactionInput): Promise<PvitInitResult> {
  const res = await pvitRequest<TransactionResponse>("POST", pvitUrl("PVIT_PAYMENT_URL"), {
    body: {
      agent: "BBGABON",
      amount: input.amount,
      callback_url_code: pvitCallbackUrlCode(),
      customer_account_number: input.msisdn,
      merchant_operation_account_code: pvitOperationAccountCode(),
      transaction_type: input.type,
      owner_charge: input.chargeOwner,
      owner_charge_operator: input.chargeOwner,
      free_info: input.freeInfo.slice(0, 15),
      product: input.product.slice(0, 15),
      operator_code: input.operator,
      reference: input.reference,
      service: "RESTFUL",
    },
  });
  return { transactionId: res.reference_id ?? null, outcome: mapPvitStatus(res.status) };
}

// A customer payment request: PVit pushes a PIN prompt (USSD) to the customer's phone and the
// call returns PENDING at once. The FINAL status arrives asynchronously on the callback URL
// (and is re-checkable through the status API) — never assume it from this response.
export async function requestPvitCollection(input: Omit<TransactionInput, "type" | "chargeOwner">): Promise<PvitInitResult> {
  return submit({ ...input, type: "PAYMENT", chargeOwner: "CUSTOMER" });
}

// Pays a wallet out of the operation account (PVit's GIVE_CHANGE: "send all or part of an
// amount back to a customer"). Unlike a collection it is processed synchronously: the response
// carries the final SUCCESS/FAILED. The platform bears the fees so the hacker receives the full
// reward.
export async function requestPvitPayout(input: Omit<TransactionInput, "type" | "chargeOwner">): Promise<PvitInitResult> {
  return submit({ ...input, type: "GIVE_CHANGE", chargeOwner: "MERCHANT" });
}

// True when the failure is PVit explicitly refusing the request (validation, unknown merchant,
// duplicate reference…): nothing was sent. False for anything we can't be sure of — timeout,
// network error, 5xx — where the transaction may or may not have been created.
export function isDefinitiveRefusal(err: unknown): boolean {
  return err instanceof PvitRefusedError || (err instanceof PvitHttpError && err.status >= 400 && err.status < 500);
}
