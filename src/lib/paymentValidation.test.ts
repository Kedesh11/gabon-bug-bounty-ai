import { describe, it, expect } from "vitest";
import {
  luhnCheck,
  isValidIban,
  isValidCryptoAddress,
  validateGabonPhone,
  detectCardBrand,
  isExpiryInFuture,
  formatCardNumber,
  formatExpiryInput,
  sanitizeAlphaNumeric,
} from "./paymentValidation";

describe("luhnCheck", () => {
  it("accepte un numéro de carte Visa valide", () => {
    expect(luhnCheck("4111111111111111")).toBe(true);
  });

  it("rejette un numéro dont la somme de contrôle est invalide", () => {
    expect(luhnCheck("4111111111111112")).toBe(false);
  });
});

describe("detectCardBrand", () => {
  it("détecte une carte Visa", () => {
    expect(detectCardBrand("4111111111111111")).toBe("visa");
  });

  it("détecte une carte Mastercard", () => {
    expect(detectCardBrand("5500000000000004")).toBe("mastercard");
  });

  it("détecte une carte Amex", () => {
    expect(detectCardBrand("340000000000009")).toBe("amex");
  });

  it("retourne unknown pour un numéro non reconnu", () => {
    expect(detectCardBrand("1234567890123456")).toBe("unknown");
  });
});

describe("isExpiryInFuture", () => {
  it("rejette un format invalide", () => {
    expect(isExpiryInFuture("13/25")).toBe(false);
    expect(isExpiryInFuture("1225")).toBe(false);
  });

  it("rejette une date déjà expirée", () => {
    expect(isExpiryInFuture("01/20")).toBe(false);
  });

  it("accepte une date plausible dans le futur", () => {
    expect(isExpiryInFuture("12/35")).toBe(true);
  });

  it("rejette une date trop lointaine (garde-fou anti-saisie farfelue)", () => {
    expect(isExpiryInFuture("01/90")).toBe(false);
  });
});

describe("isValidIban", () => {
  it("accepte un IBAN français valide", () => {
    expect(isValidIban("FR7630006000011234567890189")).toBe(true);
  });

  it("accepte un IBAN avec espaces et casse mixte", () => {
    expect(isValidIban("fr76 3000 6000 0112 3456 7890 189")).toBe(true);
  });

  it("rejette un IBAN dont la clé de contrôle est fausse", () => {
    expect(isValidIban("FR7630006000011234567890180")).toBe(false);
  });

  it("rejette une chaîne qui n'a pas la forme d'un IBAN", () => {
    expect(isValidIban("PAS_UN_IBAN")).toBe(false);
  });
});

describe("isValidCryptoAddress", () => {
  it("accepte une adresse BTC bech32", () => {
    expect(isValidCryptoAddress("btc", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
  });

  it("accepte une adresse BTC legacy", () => {
    expect(isValidCryptoAddress("btc", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true);
  });

  it("accepte une adresse ETH valide", () => {
    expect(isValidCryptoAddress("eth", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(true);
  });

  it("rejette une adresse ETH mal formée", () => {
    expect(isValidCryptoAddress("eth", "0x123")).toBe(false);
  });

  it("accepte une adresse USDT au format TRC20", () => {
    expect(isValidCryptoAddress("usdt", "TXYZopVvutHFXcRSC7SC5RyfSpM3E62NC8")).toBe(true);
  });
});

describe("validateGabonPhone", () => {
  it("rejette un numéro sans indicatif +241", () => {
    expect(validateGabonPhone("077123456", "airtel")).toMatch(/\+241/);
  });

  it("accepte un numéro Airtel valide", () => {
    expect(validateGabonPhone("+24177123456", "airtel")).toBeNull();
  });

  it("rejette un préfixe Airtel qui ne correspond pas au fournisseur", () => {
    expect(validateGabonPhone("+24162123456", "airtel")).toMatch(/Airtel/);
  });

  it("accepte un numéro Moov valide", () => {
    expect(validateGabonPhone("+24162123456", "moov")).toBeNull();
  });
});

describe("formatCardNumber", () => {
  it("regroupe les chiffres par blocs de 4 et tronque à 19 chiffres", () => {
    expect(formatCardNumber("41111111111111111111")).toBe("4111 1111 1111 1111 111");
  });
});

describe("formatExpiryInput", () => {
  it("insère le séparateur après le mois", () => {
    expect(formatExpiryInput("1225")).toBe("12/25");
  });

  it("laisse le champ intact tant que le mois n'est pas complet", () => {
    expect(formatExpiryInput("1")).toBe("1");
  });
});

describe("sanitizeAlphaNumeric", () => {
  it("supprime les caractères non alphanumériques et met en majuscules", () => {
    expect(sanitizeAlphaNumeric("fr76 3000-6000")).toBe("FR7630006000");
  });
});
