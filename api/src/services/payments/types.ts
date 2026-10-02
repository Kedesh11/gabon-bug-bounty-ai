export type CollectionMethod = "card" | "mobile_money";

export interface CreateCollectionInput {
  paymentId: string; // our Payment row id — becomes the provider-side transaction/idempotency reference
  amount: number; // smallest currency unit is not used here; XAF has no minor unit, so this is a plain integer amount
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CollectionResult {
  providerRef: string;
  redirectUrl: string;
}

export interface CreatePayoutInput {
  payoutId: string;
  // Which try this is — only CinetPay needs it (a unique client_transaction_id per try).
  attempt?: number;
  amount: number;
  currency: string;
  hackerName: string;
}

export interface StripePayoutInput extends CreatePayoutInput {
  stripeAccountId: string;
}

export interface CinetPayPayoutInput extends CreatePayoutInput {
  phoneNumber: string;
  mobileMoneyProvider: string; // "airtel" | "mtn" | "moov" | "orange"
}

export interface PayoutResult {
  providerRef: string;
  // "succeeded": money is gone (Stripe transfers are synchronous). "pending": accepted by the
  // provider but not settled (CinetPay mobile money) — resolved later, see cinetpay/transferStatus.ts.
  status: "succeeded" | "pending";
}
