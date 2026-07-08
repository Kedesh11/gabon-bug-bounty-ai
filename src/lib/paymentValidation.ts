import type { CardBrand, CryptoType, MobileMoneyProvider } from "@/stores/dataStore";

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const cardExpiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
export const cardCvvRegex = /^\d{3,4}$/;
export const bankAccountRegex = /^[A-Z0-9]{6,34}$/;
export const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9' -]{2,80}$/;
export const countryRegex = /^(?:[A-Za-z]{2}|[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,56})$/;

export const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, " ");
export const sanitizeAlphaNumeric = (value: string) => value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

export const sanitizePhoneInput = (value: string) => {
  const compact = value.replace(/[^\d+]/g, "");
  if (!compact) return "";

  const startsWithPlus = compact[0] === "+";
  const digits = compact.replace(/\+/g, "");
  return `${startsWithPlus ? "+" : ""}${digits}`;
};

export const validateGabonPhone = (phone: string, provider: MobileMoneyProvider) => {
  const clean = phone.replace(/\s+/g, "");

  // Rule: Must start with +241
  if (!clean.startsWith("+241")) return "Le numéro doit commencer par +241 (indicatif Gabon)";

  const rest = clean.slice(4);

  // Gabon numbers are 7 digits (old) or 8 digits (current) or 9 with leading 0
  // Standard format for +241 is followed by 8 digits (the 0 of 077 is dropped)
  // Example: +241 77 12 34 56 (8 digits) or +241 077 12 34 56 (9 digits)

  const airtelPrefixes = ["077", "77", "074", "74"];
  const moovPrefixes = ["062", "62", "066", "66"];

  if (provider === "airtel") {
    const isValid = airtelPrefixes.some(p => rest.startsWith(p));
    if (!isValid) return "Numéro Airtel invalide. Utilisez 077, 77, 074 ou 74.";
  } else if (provider === "moov") {
    const isValid = moovPrefixes.some(p => rest.startsWith(p));
    if (!isValid) return "Numéro Moov/Maroc Telecom invalide. Utilisez 062, 62, 066 ou 66.";
  }

  if (rest.length < 7 || rest.length > 9) return "Longueur de numéro invalide pour le Gabon";

  return null;
};

export const formatCardNumber = (value: string) => value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

export const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

export const luhnCheck = (digits: string) => {
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

export const detectCardBrand = (digits: string): CardBrand | "unknown" => {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return "visa";
  if (/^(5[1-5]\d{14}|2(2[2-9]|[3-6]\d|7[01])\d{12}|2720\d{12})$/.test(digits)) return "mastercard";
  if (/^3[47]\d{13}$/.test(digits)) return "amex";
  return "unknown";
};

export const isExpiryInFuture = (value: string) => {
  if (!cardExpiryRegex.test(value)) return false;
  const [monthStr, yearStr] = value.split("/");
  const month = Number(monthStr);
  const year = 2000 + Number(yearStr);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (year > currentYear + 20) return false;
  return true;
};

export const isValidIban = (value: string) => {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const expanded = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of expanded) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
};

export const isValidCryptoAddress = (type: CryptoType, address: string) => {
  const trimmed = address.trim();
  if (type === "btc") {
    return /^(bc1[ac-hj-np-z02-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(trimmed);
  }
  if (type === "eth") {
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  }
  const isErc20 = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isTrc20 = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed);
  const isOmni = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed);
  return isErc20 || isTrc20 || isOmni;
};
