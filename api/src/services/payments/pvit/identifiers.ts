import { createHash } from "node:crypto";

// PVit's `reference` must be unique, alphanumeric and at most 20 characters, and is what its
// callback echoes back as merchantReferenceId. Our ids are 36-character UUIDs, so each money
// movement gets a compact deterministic reference: a one-letter kind, 13 hex characters of
// the id's SHA-256 (52 bits — collisions across a platform's lifetime are not a realistic
// concern, and PVit itself rejects a duplicate reference), and the attempt number.
// "C" = collection (programme funding), "P" = payout (hacker reward).
export function pvitReference(kind: "C" | "P", id: string, attempt = 1): string {
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 13);
  return `${kind}${digest}${attempt}`; // 1 + 13 + (1–5 digits) ≤ 19
}

export type PvitOperator = "AIRTEL_MONEY" | "MOOV_MONEY";

// Our MobileMoneyProvider enum also lists mtn and orange (other countries): PVit only serves
// Airtel Money and Moov Money in Gabon.
export function toPvitOperator(provider: string | null | undefined): PvitOperator | null {
  if (provider === "airtel") return "AIRTEL_MONEY";
  if (provider === "moov") return "MOOV_MONEY";
  return null;
}

// PVit documents Gabonese numbers in national format with the leading 0 ("074111111"), no
// country code. We store them as "+241…" with or without that 0 (see paymentValidation.ts).
// Returns null for anything that doesn't normalise to 0 + 8 digits (e.g. legacy 7-digit numbers).
export function toPvitMsisdn(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;
  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("241")) digits = digits.slice(3);
  if (digits.length === 8) digits = `0${digits}`;
  return /^0\d{8}$/.test(digits) ? digits : null;
}
