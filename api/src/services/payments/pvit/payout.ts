import { pvitReference, toPvitMsisdn, toPvitOperator } from "./identifiers.js";
import { requestPvitPayout } from "./transaction.js";
import { PvitRefusedError } from "./client.js";
import type { PayoutResult, PvitPayoutInput } from "../types.js";

// Pays a hacker's mobile-money wallet from the platform's PVit operation account (GIVE_CHANGE).
// PVit processes it synchronously, so a SUCCESS here really is final; PENDING/AMBIGUOUS stay
// pending and are settled through the status API.
export async function createPvitPayout(input: PvitPayoutInput): Promise<PayoutResult> {
  if (input.currency.toUpperCase() !== "XAF") throw new PvitRefusedError("Le mobile money (PVit) ne gère que le XAF");
  const operator = toPvitOperator(input.mobileMoneyProvider);
  if (!operator) throw new PvitRefusedError("Opérateur mobile money non pris en charge (Airtel Money ou Moov Money uniquement)");
  const msisdn = toPvitMsisdn(input.phoneNumber);
  if (!msisdn) throw new PvitRefusedError("Numéro de téléphone gabonais invalide pour le mobile money");

  const reference = pvitReference("P", input.payoutId, input.attempt ?? 1);
  const result = await requestPvitPayout({
    reference,
    amount: input.amount,
    msisdn,
    operator,
    product: "RECOMPENSE",
    freeInfo: "Bug bounty",
  });

  if (result.outcome === "failed") throw new PvitRefusedError("PVit a refusé le versement");
  return { providerRef: reference, providerTxId: result.transactionId, status: result.outcome === "succeeded" ? "succeeded" : "pending" };
}
