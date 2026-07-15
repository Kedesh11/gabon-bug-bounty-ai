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
}
