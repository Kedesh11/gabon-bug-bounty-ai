import { createStripeCollection } from "./stripe/collection.js";
import { createCinetpayCollection } from "./cinetpay/collection.js";
import { createStripePayout } from "./stripe/payout.js";
import { createCinetpayPayout } from "./cinetpay/payout.js";
import type { CollectionMethod, CollectionResult, CreateCollectionInput, PayoutResult } from "./types.js";

export type Provider = "stripe" | "cinetpay";

// Routes an entreprise's programme funding to the right provider sub-service
// based on the payment method they chose.
export async function createCollection(
  method: CollectionMethod,
  input: CreateCollectionInput,
): Promise<{ provider: Provider } & CollectionResult> {
  if (method === "card") {
    return { provider: "stripe", ...(await createStripeCollection(input)) };
  }
  return { provider: "cinetpay", ...(await createCinetpayCollection(input)) };
}

export interface HackerPayoutContext {
  hackerName: string;
  stripeAccountId: string | null;
  mobileMoneyPhoneNumber: string | null;
  mobileMoneyProvider: string | null;
}

// A hacker with an onboarded Stripe Connect account is paid via Stripe transfer;
// otherwise falls back to their configured mobile money number via CinetPay.
// Neither configured is a hard error — there's nothing safe to do automatically.
export async function createPayout(
  payoutId: string,
  amount: number,
  currency: string,
  hacker: HackerPayoutContext,
): Promise<{ provider: Provider } & PayoutResult> {
  if (hacker.stripeAccountId) {
    const result = await createStripePayout({
      payoutId,
      amount,
      currency,
      hackerName: hacker.hackerName,
      stripeAccountId: hacker.stripeAccountId,
    });
    return { provider: "stripe", ...result };
  }

  if (hacker.mobileMoneyPhoneNumber && hacker.mobileMoneyProvider) {
    const result = await createCinetpayPayout({
      payoutId,
      amount,
      currency,
      hackerName: hacker.hackerName,
      phoneNumber: hacker.mobileMoneyPhoneNumber,
      mobileMoneyProvider: hacker.mobileMoneyProvider,
    });
    return { provider: "cinetpay", ...result };
  }

  throw new Error(
    `${hacker.hackerName} n'a pas de moyen de paiement actif (ni compte Stripe Connect onboardé, ni mobile money configuré)`,
  );
}
