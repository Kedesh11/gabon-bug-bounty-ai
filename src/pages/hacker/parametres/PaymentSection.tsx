import { ArrowDownToLine, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HackerPaymentConfig, PaymentMethod } from "@/types/domain";
import { MobileMoneyFields } from "./fields/MobileMoneyFields";
import { BankTransferFields } from "./fields/BankTransferFields";
import { CardFields } from "./fields/CardFields";
import { PaypalFields } from "./fields/PaypalFields";
import { CryptoFields } from "./fields/CryptoFields";
import { useContent } from "@/hooks/api/content";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mobile_money: "Mobile Money",
  bank_transfer: "Transfert bancaire",
  bank_card: "Carte bancaire (Visa, etc.)",
  paypal: "PayPal",
  crypto: "Crypto",
};

interface PaymentSectionProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  togglePaymentMethod: (method: PaymentMethod) => void;
  validations: Record<string, boolean | null>;
}

export function PaymentSection({ config, setField, togglePaymentMethod, validations }: PaymentSectionProps) {
  const heading = useContent("hacker.parametres.payment.heading", "Configuration paiement");
  const gainsHelp = useContent("hacker.parametres.payment.gains-help", "Activez cette option pour recevoir vos paiements.");
  const methodsHeading = useContent("hacker.parametres.payment.methods-heading", "Ajouter un ou plusieurs moyens de paiement");
  return (
    <>
      <div className="glass-card rounded-xl p-5 border-glow space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Activer les gains</p>
            <p className="text-xs text-muted-foreground font-mono">{gainsHelp}</p>
          </div>
          <Switch checked={config.gainsEnabled} onCheckedChange={(value) => setField("gainsEnabled", value)} />
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 border-glow space-y-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-primary" />
          {methodsHeading}
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
          <MobileMoneyFields config={config} setField={setField} validations={validations} />
        )}
        {config.paymentMethods.includes("bank_transfer") && (
          <BankTransferFields config={config} setField={setField} validations={validations} />
        )}
        {config.paymentMethods.includes("bank_card") && (
          <CardFields config={config} setField={setField} validations={validations} />
        )}
        {config.paymentMethods.includes("paypal") && (
          <PaypalFields config={config} setField={setField} validations={validations} />
        )}
        {config.paymentMethods.includes("crypto") && (
          <CryptoFields config={config} setField={setField} validations={validations} />
        )}
      </div>
    </>
  );
}
