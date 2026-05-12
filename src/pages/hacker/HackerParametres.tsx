import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Wallet, Landmark, Smartphone, Save, ArrowDownToLine, CreditCard, BellRing, UserCircle2, ImagePlus, Send } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { addNotification } from "@/lib/notifications";

type PaymentMethod = "mobile_money" | "bank_transfer" | "bank_card" | "paypal" | "crypto";
type MobileMoneyProvider = "airtel" | "mtn" | "moov" | "orange";
type CryptoType = "btc" | "eth" | "usdt";
type PreferredCurrency = "USD" | "EUR" | "XAF";
type CardBrand = "visa" | "mastercard" | "amex" | "other";

interface HackerPaymentConfig {
  gainsEnabled: boolean;
  paymentMethods: PaymentMethod[];
  mobileMoneyProvider: MobileMoneyProvider;
  phoneNumber: string;
  accountName: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  bankCountry: string;
  cardBrand: CardBrand;
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardBillingCountry: string;
  paypalEmail: string;
  cryptoType: CryptoType;
  walletAddress: string;
  preferredCurrency: PreferredCurrency;
  autoWithdrawal: boolean;
  minimumPayoutThreshold: string;
}

interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  paymentAlerts: boolean;
  reportStatusAlerts: boolean;
  securityAlerts: boolean;
}

const DEFAULT_CONFIG: HackerPaymentConfig = {
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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intlPhoneRegex = /^\+[1-9]\d{7,14}$/;
const cardExpiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
const cardCvvRegex = /^\d{3,4}$/;
const bankAccountRegex = /^[A-Z0-9]{6,34}$/;
const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9' -]{2,80}$/;
const countryRegex = /^(?:[A-Za-z]{2}|[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,56})$/;
const MIN_PAYOUT_BY_CURRENCY: Record<PreferredCurrency, number> = {
  USD: 10,
  EUR: 10,
  XAF: 5000,
};
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mobile_money: "Mobile Money",
  bank_transfer: "Transfert bancaire",
  bank_card: "Carte bancaire (Visa, etc.)",
  paypal: "PayPal",
  crypto: "Crypto",
};
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: false,
  paymentAlerts: true,
  reportStatusAlerts: true,
  securityAlerts: true,
};

const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, " ");
const sanitizeAlphaNumeric = (value: string) => value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
const sanitizePhoneInput = (value: string) => {
  const compact = value.replace(/[^\d+]/g, "");
  if (!compact) return "";
  const startsWithPlus = compact[0] === "+";
  const digits = compact.replace(/\+/g, "");
  return `${startsWithPlus ? "+" : ""}${digits}`;
};
const formatCardNumber = (value: string) => value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

const luhnCheck = (digits: string) => {
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

const detectCardBrand = (digits: string): CardBrand | "unknown" => {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return "visa";
  if (/^(5[1-5]\d{14}|2(2[2-9]|[3-6]\d|7[01])\d{12}|2720\d{12})$/.test(digits)) return "mastercard";
  if (/^3[47]\d{13}$/.test(digits)) return "amex";
  return "unknown";
};

const isExpiryInFuture = (value: string) => {
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

const isValidIban = (value: string) => {
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

const isValidCryptoAddress = (type: CryptoType, address: string) => {
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

export default function HackerParametres() {
  const { user, updateProfile } = useAuth();
  const { hackers, updateHacker } = useData();
  const [config, setConfig] = useState<HackerPaymentConfig>(DEFAULT_CONFIG);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    if (!user) return;
    const key = `bb_hacker_payment_${user.id}`;
    const saved = localStorage.getItem(key);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<HackerPaymentConfig> & { paymentMethod?: PaymentMethod };
      const migratedPaymentMethods =
        Array.isArray(parsed.paymentMethods) && parsed.paymentMethods.length > 0
          ? parsed.paymentMethods
          : parsed.paymentMethod
            ? [parsed.paymentMethod]
            : DEFAULT_CONFIG.paymentMethods;

      setConfig((prev) => ({ ...prev, ...parsed, paymentMethods: migratedPaymentMethods }));
    } catch {
      toast.error("Configuration paiement invalide, réinitialisée");
      setConfig(DEFAULT_CONFIG);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileAvatar(user.avatar);

    const prefKey = `bb_notify_prefs_${user.id}`;
    const savedPrefs = localStorage.getItem(prefKey);
    if (!savedPrefs) {
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      return;
    }
    try {
      const parsed = JSON.parse(savedPrefs) as Partial<NotificationPreferences>;
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed });
    } catch {
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    }
  }, [user]);

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

  const setNotificationPreference = <K extends keyof NotificationPreferences>(field: K, value: NotificationPreferences[K]) => {
    setNotificationPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfileAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!user) return;
    const normalizedName = normalizeSpaces(profileName);
    const normalizedEmail = profileEmail.trim().toLowerCase();

    if (!nameRegex.test(normalizedName)) {
      toast.error("Nom invalide");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Email invalide");
      return;
    }

    const updated = updateProfile({ name: normalizedName, email: normalizedEmail, avatar: profileAvatar });
    if (!updated) {
      toast.error("Impossible de mettre à jour le profil (email déjà utilisé)");
      return;
    }

    const hacker = hackers.find((entry) => entry.id === user.id);
    if (hacker) {
      updateHacker(user.id, { name: updated.name, email: updated.email });
    }

    addNotification(user.id, {
      title: "Profil mis à jour",
      message: "Vos informations d'inscription ont été mises à jour.",
      type: "success",
    });

    toast.success("Informations d'inscription mises à jour");
  };

  const saveNotificationPreferences = () => {
    if (!user) return;
    const key = `bb_notify_prefs_${user.id}`;
    localStorage.setItem(key, JSON.stringify(notificationPreferences));
    addNotification(user.id, {
      title: "Préférences notifications mises à jour",
      message: "Vos réglages de notification ont été enregistrés.",
      type: "info",
    });
    toast.success("Préférences notifications enregistrées");
  };

  const sendTestNotification = () => {
    if (!user) return;
    if (!notificationPreferences.inAppEnabled) {
      toast.error("Activez d'abord les notifications in-app");
      return;
    }
    addNotification(user.id, {
      title: "Notification de test",
      message: "Le système de notification fonctionne correctement.",
      type: "success",
    });
    toast.success("Notification de test envoyée");
  };

  const validateConfig = () => {
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
      if (!intlPhoneRegex.test(config.phoneNumber.trim())) {
        return "Le numéro doit être au format international (ex: +24106123456)";
      }
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
  };

  const handleSave = () => {
    if (!user) return;

    const validationError = validateConfig();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const key = `bb_hacker_payment_${user.id}`;
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
    localStorage.setItem(key, JSON.stringify(payload));
    setConfig(payload);
    addNotification(user.id, {
      title: "Moyens de paiement mis à jour",
      message: "Votre configuration de paiement a été validée.",
      type: "success",
    });
    toast.success("Paramètres de paiement enregistrés");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black text-foreground">Paramètres</h1>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <div className="flex items-center gap-3">
            <UserCircle2 className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Informations d'inscription</h2>
          </div>
          <div className="flex items-center gap-4">
            {profileAvatar ? (
              <img src={profileAvatar} alt="Photo de profil" className="w-16 h-16 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center">
                <UserCircle2 className="w-9 h-9 text-muted-foreground" />
              </div>
            )}
            <div>
              <label className="inline-flex items-center gap-2 text-xs font-mono text-primary cursor-pointer">
                <ImagePlus className="w-3 h-3" />
                Ajouter / changer la photo
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, WebP · max 2MB</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">Nom complet / pseudo</Label>
              <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">Email</Label>
              <Input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
          </div>
          <Button onClick={saveProfile} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Mettre à jour mon inscription
          </Button>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">Notifications in-app</span>
              <Switch checked={notificationPreferences.inAppEnabled} onCheckedChange={(value) => setNotificationPreference("inAppEnabled", value)} />
            </div>
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">Notifications email</span>
              <Switch checked={notificationPreferences.emailEnabled} onCheckedChange={(value) => setNotificationPreference("emailEnabled", value)} />
            </div>
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">Alertes paiement</span>
              <Switch checked={notificationPreferences.paymentAlerts} onCheckedChange={(value) => setNotificationPreference("paymentAlerts", value)} />
            </div>
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">Statut des rapports</span>
              <Switch checked={notificationPreferences.reportStatusAlerts} onCheckedChange={(value) => setNotificationPreference("reportStatusAlerts", value)} />
            </div>
            <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between md:col-span-2">
              <span className="text-sm text-foreground">Alertes sécurité</span>
              <Switch checked={notificationPreferences.securityAlerts} onCheckedChange={(value) => setNotificationPreference("securityAlerts", value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveNotificationPreferences} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer notifications
            </Button>
            <Button onClick={sendTestNotification} variant="secondary">
              <Send className="w-4 h-4 mr-2" />
              Envoyer un test
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Configuration paiement</h2>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Activer les gains</p>
              <p className="text-xs text-muted-foreground font-mono">Activez cette option pour recevoir vos paiements.</p>
            </div>
            <Switch checked={config.gainsEnabled} onCheckedChange={(value) => setField("gainsEnabled", value)} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-primary" />
            Ajouter un ou plusieurs moyens de paiement
          </h3>

          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Moyens de paiement</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => {
                const checked = config.paymentMethods.includes(method);
                return (
                  <label
                    key={method}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      checked ? "border-primary text-primary bg-primary/10" : "border-border bg-secondary text-muted-foreground"
                    } ${!config.gainsEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePaymentMethod(method)}
                      disabled={!config.gainsEnabled}
                    />
                    <span>{PAYMENT_METHOD_LABELS[method]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {config.paymentMethods.includes("mobile_money") && (
            <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
              <p className="text-xs font-mono text-primary flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> Mobile Money (priorité Afrique)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Opérateur</Label>
                  <select
                    value={config.mobileMoneyProvider}
                    onChange={(event) => setField("mobileMoneyProvider", event.target.value as MobileMoneyProvider)}
                    className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    disabled={!config.gainsEnabled}
                  >
                    <option value="airtel">Airtel</option>
                    <option value="mtn">MTN</option>
                    <option value="moov">Moov</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Numéro de téléphone</Label>
                  <Input
                    value={config.phoneNumber}
                    onChange={(event) => setField("phoneNumber", sanitizePhoneInput(event.target.value))}
                    placeholder="+24106123456"
                    className="mt-1 bg-background border-border"
                    maxLength={16}
                    disabled={!config.gainsEnabled}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">Nom du compte</Label>
                <Input
                  value={config.accountName}
                  onChange={(event) => setField("accountName", event.target.value)}
                  placeholder="Nom complet"
                  className="mt-1 bg-background border-border"
                  disabled={!config.gainsEnabled}
                />
              </div>
            </div>
          )}

          {config.paymentMethods.includes("bank_transfer") && (
            <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
              <p className="text-xs font-mono text-primary flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Transfert bancaire
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Nom de banque</Label>
                  <Input
                    value={config.bankName}
                    onChange={(event) => setField("bankName", event.target.value)}
                    className="mt-1 bg-background border-border"
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Titulaire du compte</Label>
                  <Input
                    value={config.accountHolderName}
                    onChange={(event) => setField("accountHolderName", event.target.value)}
                    className="mt-1 bg-background border-border"
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Numéro de compte</Label>
                  <Input
                    value={config.accountNumber}
                    onChange={(event) => setField("accountNumber", sanitizeAlphaNumeric(event.target.value))}
                    className="mt-1 bg-background border-border"
                    maxLength={34}
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">IBAN (optionnel)</Label>
                  <Input
                    value={config.iban}
                    onChange={(event) => setField("iban", sanitizeAlphaNumeric(event.target.value))}
                    className="mt-1 bg-background border-border"
                    maxLength={34}
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">SWIFT code (optionnel)</Label>
                  <Input
                    value={config.swiftCode}
                    onChange={(event) => setField("swiftCode", sanitizeAlphaNumeric(event.target.value))}
                    className="mt-1 bg-background border-border"
                    maxLength={11}
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Pays de la banque</Label>
                  <Input
                    value={config.bankCountry}
                    onChange={(event) => setField("bankCountry", event.target.value)}
                    className="mt-1 bg-background border-border"
                    maxLength={56}
                    disabled={!config.gainsEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {config.paymentMethods.includes("bank_card") && (
            <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
              <p className="text-xs font-mono text-primary flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Carte bancaire (Visa, Mastercard, etc.)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Réseau carte</Label>
                  <select
                    value={config.cardBrand}
                    onChange={(event) => setField("cardBrand", event.target.value as CardBrand)}
                    className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    disabled={!config.gainsEnabled}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Nom du porteur</Label>
                  <Input
                    value={config.cardHolderName}
                    onChange={(event) => setField("cardHolderName", event.target.value)}
                    placeholder="Nom complet"
                    className="mt-1 bg-background border-border"
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Numéro de carte</Label>
                  <Input
                    value={config.cardNumber}
                    onChange={(event) => setField("cardNumber", formatCardNumber(event.target.value))}
                    placeholder="4111 1111 1111 1111"
                    className="mt-1 bg-background border-border"
                    maxLength={23}
                    disabled={!config.gainsEnabled}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">Expiration</Label>
                    <Input
                      value={config.cardExpiry}
                      onChange={(event) => setField("cardExpiry", formatExpiryInput(event.target.value))}
                      placeholder="MM/AA"
                      className="mt-1 bg-background border-border"
                      maxLength={5}
                      disabled={!config.gainsEnabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">CVV</Label>
                    <Input
                      value={config.cardCvv}
                      onChange={(event) => setField("cardCvv", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className="mt-1 bg-background border-border"
                      maxLength={4}
                      disabled={!config.gainsEnabled}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">Pays de facturation</Label>
                  <Input
                    value={config.cardBillingCountry}
                    onChange={(event) => setField("cardBillingCountry", event.target.value)}
                    placeholder="Gabon"
                    className="mt-1 bg-background border-border"
                    maxLength={56}
                    disabled={!config.gainsEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {config.paymentMethods.includes("paypal") && (
            <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
              <Label className="text-xs font-mono text-muted-foreground">Email PayPal</Label>
              <Input
                value={config.paypalEmail}
                onChange={(event) => setField("paypalEmail", event.target.value.trim().toLowerCase())}
                placeholder="pay@example.com"
                className="bg-background border-border"
                maxLength={254}
                disabled={!config.gainsEnabled}
              />
            </div>
          )}

          {config.paymentMethods.includes("crypto") && (
            <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
              <Label className="text-xs font-mono text-muted-foreground">Crypto</Label>
              <select
                value={config.cryptoType}
                onChange={(event) => setField("cryptoType", event.target.value as CryptoType)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
                disabled={!config.gainsEnabled}
              >
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
                <option value="usdt">USDT</option>
              </select>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">Adresse wallet</Label>
                <Input
                  value={config.walletAddress}
                  onChange={(event) => setField("walletAddress", event.target.value)}
                  placeholder="Adresse de réception"
                  className="mt-1 bg-background border-border"
                  maxLength={128}
                  disabled={!config.gainsEnabled}
                />
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Préférences globales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">Devise préférée</Label>
              <select
                value={config.preferredCurrency}
                onChange={(event) => setField("preferredCurrency", event.target.value as PreferredCurrency)}
                className="mt-1 w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="XAF">XAF</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">Seuil minimum de paiement</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={config.minimumPayoutThreshold}
                onChange={(event) => setField("minimumPayoutThreshold", event.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-1 bg-secondary border-border"
                placeholder="50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Retrait automatique</p>
              <p className="text-xs text-muted-foreground font-mono">Si activé, le paiement sera envoyé automatiquement.</p>
            </div>
            <Switch checked={config.autoWithdrawal} onCheckedChange={(value) => setField("autoWithdrawal", value)} />
          </div>
        </div>

        <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder la configuration paiement
        </Button>
      </div>
    </DashboardLayout>
  );
}
