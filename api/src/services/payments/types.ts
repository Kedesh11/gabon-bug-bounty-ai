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
  // Mobile money (PVit): the paying customer's wallet.
  customerPhone?: string;
  customerOperator?: string; // our MobileMoneyProvider value: "airtel" | "moov"
}

export interface CollectionResult {
  providerRef: string;
  // null when there is nothing to redirect to: a PVit mobile-money request is approved by a
  // PIN prompt on the customer's own phone.
  redirectUrl: string | null;
  // The provider's own transaction id when it has one (PVit) — what its status API is asked about.
  providerTxId?: string | null;
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

export interface PvitPayoutInput extends CreatePayoutInput {
  phoneNumber: string;
  mobileMoneyProvider: string;
}

export interface PayoutResult {
  providerRef: string;
  providerTxId?: string | null;
  // "succeeded": money is gone (Stripe transfers are synchronous). "pending": accepted by the
  // provider but not settled (CinetPay mobile money) — resolved later, see cinetpay/transferStatus.ts.
  status: "succeeded" | "pending";
}
