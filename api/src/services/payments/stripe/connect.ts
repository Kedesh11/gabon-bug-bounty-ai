import { stripe } from "./client.js";

// Marketplace pattern (see stripe-best-practices skill, connect.md): the hacker's
// account only ever *receives* funds transferred from the platform's balance, it
// never accepts card payments itself — so it requests the Recipient configuration
// with the `stripe_balance.stripe_transfers` capability only, never `merchant`/
// `card_payments`. Express dashboard + application-owned fees/losses matches the
// "Separate charges and transfers / hold-and-release" business model this platform
// uses (entreprise funds upfront, platform pays the hacker out later).
export async function createRecipientAccount(email: string, displayName: string) {
  const account = await stripe.v2.core.accounts.create({
    contact_email: email,
    display_name: displayName,
    dashboard: "express",
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
  });

  return account.id;
}

export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        return_url: returnUrl,
        refresh_url: refreshUrl,
      },
    },
  });

  return link.url;
}

// Go-live readiness check (skill's "Critical rule #2"): never rely on the deprecated
// v1 `payouts_enabled`/`charges_enabled` fields — check v2 capability status directly.
export async function isRecipientTransfersActive(accountId: string): Promise<boolean> {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });

  return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
}
