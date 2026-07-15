import { stripe } from "./client.js";
import { isRecipientTransfersActive } from "./connect.js";
import type { PayoutResult, StripePayoutInput } from "../types.js";

const ZERO_DECIMAL_CURRENCIES = new Set(["xaf", "xof", "jpy", "krw", "vnd"]);

function toStripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? amount : amount * 100;
}

// Moves funds from the platform's Stripe balance (built up from Checkout
// collections) to the hacker's connected Recipient account — the "transfer" leg
// of the separate-charges-and-transfers / hold-and-release pattern.
export async function createStripePayout(input: StripePayoutInput): Promise<PayoutResult> {
  const active = await isRecipientTransfersActive(input.stripeAccountId);
  if (!active) {
    throw new Error(
      `Le compte Stripe Connect de ${input.hackerName} n'a pas encore la capacité de transfert active (onboarding incomplet)`,
    );
  }

  const transfer = await stripe.transfers.create(
    {
      amount: toStripeAmount(input.amount, input.currency),
      currency: input.currency.toLowerCase(),
      destination: input.stripeAccountId,
      description: `Récompense bug bounty — payout ${input.payoutId}`,
    },
    { idempotencyKey: `payout-${input.payoutId}` },
  );

  return { providerRef: transfer.id };
}
