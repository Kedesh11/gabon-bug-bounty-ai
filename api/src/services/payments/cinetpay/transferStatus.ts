import { cinetpayTransferGet } from "./client.js";

export type TransferOutcome = "succeeded" | "failed" | "pending";

// CinetPay's treatment_status for a money transfer (docs: "Different statuses of a money
// transfer"): NEW = waiting, REC = being processed (both transitional), VAL = completed,
// REJ = rejected (both final). Anything unrecognised is treated as still pending rather
// than guessed at — a payout is never marked settled or failed on a value we don't know.
export function mapTreatmentStatus(treatmentStatus: unknown): TransferOutcome {
  if (treatmentStatus === "VAL") return "succeeded";
  if (treatmentStatus === "REJ") return "failed";
  return "pending";
}

// The id we hand CinetPay as client_transaction_id. The first try uses the payout id itself;
// each retry of a failed payout needs a new one, so it is suffixed with the attempt number.
export function clientTransactionId(payoutId: string, attempt: number): string {
  return attempt <= 1 ? payoutId : `${payoutId}-${attempt}`;
}

interface CinetPayTransferCheckResponse {
  code: number | string;
  message?: string;
  // Documented as the transfer's fields; read defensively as either one object or a list of
  // them (a check can be made by batch "lot" as well), since this path has no live sandbox yet.
  data?: { treatment_status?: string } | { treatment_status?: string }[];
}

// Authoritative status of a transfer, straight from CinetPay (GET /transfer/check/money).
// Returns "unknown" when CinetPay has no such transaction (a send that never reached them),
// which callers must treat differently from "pending". Network/auth failures throw.
export async function checkCinetpayTransferStatus(clientTxId: string): Promise<TransferOutcome | "unknown"> {
  const response = await cinetpayTransferGet<CinetPayTransferCheckResponse>("/transfer/check/money", {
    lang: "fr",
    client_transaction_id: clientTxId,
  });

  if (Number(response.code) !== 0) return "unknown";
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row?.treatment_status) return "unknown";
  return mapTreatmentStatus(row.treatment_status);
}
