import { stripe } from "./client.js";
import type { CollectionResult, CreateCollectionInput } from "../types.js";

// One-time payment via a hosted Checkout Session. `payment_method_types` is
// intentionally omitted so Stripe can offer the most relevant payment methods
// dynamically (see stripe-best-practices skill, payments.md).
export async function createStripeCollection(input: CreateCollectionInput): Promise<CollectionResult> {
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: input.paymentId,
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toStripeAmount(input.amount, input.currency),
            product_data: { name: input.description },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { paymentId: input.paymentId },
    },
    { idempotencyKey: `payment-${input.paymentId}` },
  );

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");

  return { providerRef: session.id, redirectUrl: session.url };
}

// Zero-decimal currencies (e.g. XAF) are passed to Stripe as-is; others are in the
// smallest unit (e.g. cents). See https://docs.stripe.com/currencies#zero-decimal.
const ZERO_DECIMAL_CURRENCIES = new Set(["xaf", "xof", "jpy", "krw", "vnd"]);

function toStripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? amount : amount * 100;
}
