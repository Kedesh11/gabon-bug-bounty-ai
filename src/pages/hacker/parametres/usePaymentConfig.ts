import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { addNotification } from "@/lib/notifications";
import {
  emailRegex,
  cardCvvRegex,
  bankAccountRegex,
  swiftRegex,
  nameRegex,
  countryRegex,
  normalizeSpaces,
  sanitizeAlphaNumeric,
  sanitizePhoneInput,
  validateGabonPhone,
  formatCardNumber,
  luhnCheck,
  detectCardBrand,
  isExpiryInFuture,
  isValidIban,
  isValidCryptoAddress,
} from "@/lib/paymentValidation";
import {
  type PaymentMethod,
  type PreferredCurrency,
  type HackerPaymentConfig,
} from "@/stores/dataStore";

export const DEFAULT_CONFIG: HackerPaymentConfig = {
  gainsEnabled: false,
  paymentMethods: ["mobile_money"],
  mobileMoneyProvider: "airtel",
  phoneNumber: "",
  accountName: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  bankCountry: "",
  cardBrand: "visa",
  cardHolderName: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardBillingCountry: "",
  paypalEmail: "",
  cryptoType: "usdt",
  walletAddress: "",
  preferredCurrency: "USD",
  autoWithdrawal: false,
  minimumPayoutThreshold: "50",
};

export const MIN_PAYOUT_BY_CURRENCY: Record<PreferredCurrency, number> = {
  USD: 10,
  EUR: 10,
  XAF: 5000,
};

function validatePaymentConfig(config: HackerPaymentConfig): string | null {
  const threshold = Number(config.minimumPayoutThreshold);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return "Le seuil minimum de paiement doit être supérieur à 0";
  }
  if (threshold < MIN_PAYOUT_BY_CURRENCY[config.preferredCurrency]) {
    return `Le seuil minimum pour ${config.preferredCurrency} est ${MIN_PAYOUT_BY_CURRENCY[config.preferredCurrency]}`;
  }

  if (!config.gainsEnabled) return null;

  if (config.paymentMethods.length === 0) {
    return "Sélectionnez au moins un moyen de paiement";
  }

  if (config.paymentMethods.includes("mobile_money")) {
    if (!nameRegex.test(normalizeSpaces(config.accountName))) {
      return "Le nom du compte Mobile Money est invalide";
    }

    const gabonError = validateGabonPhone(config.phoneNumber.trim(), config.mobileMoneyProvider);
    if (gabonError) return gabonError;
  }

  if (config.paymentMethods.includes("bank_transfer")) {
    if (!nameRegex.test(normalizeSpaces(config.bankName))) return "Le nom de la banque est invalide";
    if (!nameRegex.test(normalizeSpaces(config.accountHolderName))) return "Le titulaire du compte est invalide";
    if (!bankAccountRegex.test(sanitizeAlphaNumeric(config.accountNumber))) {
      return "Le numéro de compte bancaire est invalide";
    }
    if (config.iban.trim() && !isValidIban(config.iban)) return "IBAN invalide";
    if (config.swiftCode.trim() && !swiftRegex.test(config.swiftCode.replace(/\s+/g, "").toUpperCase())) {
      return "Code SWIFT/BIC invalide";
    }
    if (!countryRegex.test(normalizeSpaces(config.bankCountry))) return "Le pays de la banque est invalide";
  }

  if (config.paymentMethods.includes("bank_card")) {
    const normalizedCardNumber = config.cardNumber.replace(/\s+/g, "");
    const detectedBrand = detectCardBrand(normalizedCardNumber);

    if (!nameRegex.test(normalizeSpaces(config.cardHolderName))) return "Le nom du porteur de carte est invalide";
    if (!/^\d{13,19}$/.test(normalizedCardNumber)) return "Le numéro de carte est invalide";
    if (!luhnCheck(normalizedCardNumber)) return "Le numéro de carte ne passe pas le contrôle de validité";
    if (config.cardBrand !== "other" && detectedBrand !== "unknown" && config.cardBrand !== detectedBrand) {
      return "Le type de carte ne correspond pas au numéro saisi";
    }
    if (!isExpiryInFuture(config.cardExpiry.trim())) {
      return "Date d'expiration invalide ou expirée (MM/AA)";
    }
    const expectedCvvLength = (config.cardBrand === "amex" || detectedBrand === "amex") ? 4 : 3;
    if (!cardCvvRegex.test(config.cardCvv.trim()) || config.cardCvv.trim().length !== expectedCvvLength) {
      return `CVV invalide (${expectedCvvLength} chiffres attendus)`;
    }
    if (!countryRegex.test(normalizeSpaces(config.cardBillingCountry))) return "Le pays de facturation est invalide";
  }

  if (config.paymentMethods.includes("paypal")) {
    const normalizedEmail = config.paypalEmail.trim().toLowerCase();
    if (normalizedEmail.length > 254 || normalizedEmail.includes("..") || !emailRegex.test(normalizedEmail)) {
      return "L'email PayPal est invalide";
    }
  }

  if (config.paymentMethods.includes("crypto")) {
    if (!config.walletAddress.trim()) return "L'adresse wallet est obligatoire";
    if (!isValidCryptoAddress(config.cryptoType, config.walletAddress)) {
      return `Adresse ${config.cryptoType.toUpperCase()} invalide`;
    }
  }

  return null;
}

export function usePaymentConfig() {
  const { user } = useAuth();
  const { hackers, updateHackerConfig } = useData();
  const hackerProfile = hackers.find(h => h.id === user?.id);

  const [config, setConfig] = useState<HackerPaymentConfig>(hackerProfile?.config || DEFAULT_CONFIG);

  useEffect(() => {
    if (hackerProfile?.config) {
      setConfig(hackerProfile.config);
    }
  }, [hackerProfile]);

  // Real-time validations
  const validations = useMemo(() => {
    const v: Record<string, boolean | null> = {};

    if (config.paymentMethods.includes("mobile_money")) {
      v.accountName = nameRegex.test(normalizeSpaces(config.accountName));
      v.phoneNumber = validateGabonPhone(config.phoneNumber.trim(), config.mobileMoneyProvider) === null;
    }

    if (config.paymentMethods.includes("bank_transfer")) {
      v.bankName = nameRegex.test(normalizeSpaces(config.bankName));
      v.accountHolderName = nameRegex.test(normalizeSpaces(config.accountHolderName));
      v.accountNumber = bankAccountRegex.test(sanitizeAlphaNumeric(config.accountNumber));
      v.iban = config.iban.trim() ? isValidIban(config.iban) : null;
      v.swiftCode = config.swiftCode.trim() ? swiftRegex.test(config.swiftCode.replace(/\s+/g, "").toUpperCase()) : null;
      v.bankCountry = nameRegex.test(normalizeSpaces(config.bankCountry));
    }

    if (config.paymentMethods.includes("bank_card")) {
      const normalized = config.cardNumber.replace(/\s+/g, "");
      v.cardHolderName = nameRegex.test(normalizeSpaces(config.cardHolderName));
      v.cardNumber = /^\d{13,19}$/.test(normalized) && luhnCheck(normalized);
      v.cardExpiry = isExpiryInFuture(config.cardExpiry.trim());
      const expectedCvvLength = (config.cardBrand === "amex" || detectCardBrand(normalized) === "amex") ? 4 : 3;
      v.cardCvv = cardCvvRegex.test(config.cardCvv.trim()) && config.cardCvv.trim().length === expectedCvvLength;
    }

    if (config.paymentMethods.includes("paypal")) {
      v.paypalEmail = emailRegex.test(config.paypalEmail.trim().toLowerCase());
    }

    if (config.paymentMethods.includes("crypto")) {
      v.walletAddress = isValidCryptoAddress(config.cryptoType, config.walletAddress);
    }

    return v;
  }, [config]);

  const setField = <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    if (!config.gainsEnabled) return;

    setConfig((prev) => {
      const exists = prev.paymentMethods.includes(method);
      return {
        ...prev,
        paymentMethods: exists
          ? prev.paymentMethods.filter((entry) => entry !== method)
          : [...prev.paymentMethods, method],
      };
    });
  };

  const handleSave = () => {
    if (!user) return;

    const validationError = validatePaymentConfig(config);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Final check for real-time validations that are not optional
    const isAllValid = Object.entries(validations).every(([, val]) => val !== false);
    if (!isAllValid) {
      toast.error("Veuillez corriger les erreurs avant d'enregistrer");
      return;
    }

    const payload: HackerPaymentConfig = {
      ...config,
      accountName: normalizeSpaces(config.accountName),
      bankName: normalizeSpaces(config.bankName),
      accountHolderName: normalizeSpaces(config.accountHolderName),
      accountNumber: sanitizeAlphaNumeric(config.accountNumber),
      iban: config.iban.replace(/\s+/g, "").toUpperCase(),
      swiftCode: config.swiftCode.replace(/\s+/g, "").toUpperCase(),
      bankCountry: normalizeSpaces(config.bankCountry),
      cardHolderName: normalizeSpaces(config.cardHolderName),
      cardNumber: formatCardNumber(config.cardNumber),
      cardExpiry: config.cardExpiry.trim(),
      cardCvv: config.cardCvv.replace(/\D/g, ""),
      cardBillingCountry: normalizeSpaces(config.cardBillingCountry),
      paypalEmail: config.paypalEmail.trim().toLowerCase(),
      walletAddress: config.walletAddress.trim(),
      phoneNumber: sanitizePhoneInput(config.phoneNumber),
      minimumPayoutThreshold: String(Number(config.minimumPayoutThreshold)),
    };

    updateHackerConfig(user.id, payload);

    addNotification(user.id, {
      title: "Moyens de paiement mis à jour",
      message: "Votre configuration de paiement a été validée.",
      type: "success",
    });
    toast.success("Paramètres de paiement enregistrés");
  };

  return { config, setField, togglePaymentMethod, validations, handleSave };
}
