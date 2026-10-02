import { pvitOperationAccountCode, pvitRequest, pvitUrl, PvitHttpError } from "./client.js";

export type PvitOutcome = "succeeded" | "failed" | "pending";

// PVit's statuses: SUCCESS / FAILED are final; PENDING is in progress; AMBIGUOUS means "uncertain,
// check again later" — treated as pending, never as a decision either way.
export function mapPvitStatus(status: unknown): PvitOutcome {
  if (status === "SUCCESS") return "succeeded";
  if (status === "FAILED") return "failed";
  return "pending";
}

export type PvitOperation = "PAYMENT" | "GIVE_CHANGE";

interface StatusResponse {
  status?: string;
  amount?: number;
  fees?: number;
  merchant_reference_id?: string;
  merchant_operation_account_code?: string;
}

export interface PvitStatusResult {
  outcome: PvitOutcome;
  amount: number | null;
  merchantReference: string | null;
  operationAccountCode: string | null;
}

// Authoritative state of a transaction, from PVit's status API. Returns null when PVit has no
// such transaction (404) — distinct from "pending". Network/auth/5xx failures throw: callers
// must not treat "couldn't ask" as an answer.
export async function getPvitTransactionStatus(transactionId: string, operation: PvitOperation): Promise<PvitStatusResult | null> {
  try {
    const res = await pvitRequest<StatusResponse>("GET", pvitUrl("PVIT_STATUS_URL"), {
      query: { transactionId, accountOperationCode: pvitOperationAccountCode(), transactionOperation: operation },
    });
    return {
      outcome: mapPvitStatus(res.status),
      amount: typeof res.amount === "number" ? res.amount : null,
      merchantReference: res.merchant_reference_id ?? null,
      operationAccountCode: res.merchant_operation_account_code ?? null,
    };
  } catch (err) {
    if (err instanceof PvitHttpError && err.status === 404) return null;
    throw err;
  }
}

// Available balance of the operation account, in XAF — or null when no balance URL is configured.
export async function getPvitBalance(): Promise<number | null> {
  let url: string;
  try {
    url = pvitUrl("PVIT_BALANCE_URL");
  } catch {
    return null;
  }
  const res = await pvitRequest<{ balance?: number }>("GET", url, { query: { accountOperationCode: pvitOperationAccountCode() } });
  return typeof res.balance === "number" ? res.balance : null;
}
