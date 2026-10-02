import { pvitReference, toPvitMsisdn, toPvitOperator } from "./identifiers.js";
import { requestPvitCollection } from "./transaction.js";
import { PvitRefusedError } from "./client.js";
import type { CollectionResult, CreateCollectionInput } from "../types.js";

// Mobile-money funding of a programme through PVit: a payment request is pushed to the
// entreprise's wallet and approved there with a PIN — no redirect. PVit settles in XAF only.
// The result is PENDING by nature; the final status comes by callback (see routes/webhooks.routes.ts).
export async function createPvitCollection(input: CreateCollectionInput): Promise<CollectionResult> {
  if (input.currency.toUpperCase() !== "XAF") {
    throw new PvitRefusedError("Le mobile money (PVit) ne gère que le XAF");
  }
  const operator = toPvitOperator(input.customerOperator);
  if (!operator) throw new PvitRefusedError("Opérateur mobile money non pris en charge (Airtel Money ou Moov Money uniquement)");
  const msisdn = toPvitMsisdn(input.customerPhone);
  if (!msisdn) throw new PvitRefusedError("Numéro de téléphone gabonais invalide pour le mobile money");

  const reference = pvitReference("C", input.paymentId);
  const result = await requestPvitCollection({
    reference,
    amount: input.amount,
    msisdn,
    operator,
    product: "FINANCEMENT",
    freeInfo: "Programme",
  });

  if (result.outcome === "failed") throw new PvitRefusedError("PVit a refusé la demande de paiement");
  return { providerRef: reference, redirectUrl: null, providerTxId: result.transactionId };
}
