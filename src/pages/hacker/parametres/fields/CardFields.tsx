import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCardNumber, formatExpiryInput } from "@/lib/paymentValidation";
import type { CardBrand, HackerPaymentConfig } from "@/stores/dataStore";
import { ValidationIndicator } from "../ValidationIndicator";

interface CardFieldsProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  validations: Record<string, boolean | null>;
}

export function CardFields({ config, setField, validations }: CardFieldsProps) {
  return (
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Nom du porteur</Label>
            <ValidationIndicator isValid={validations.cardHolderName} />
          </div>
          <Input
            value={config.cardHolderName}
            onChange={(event) => setField("cardHolderName", event.target.value)}
            placeholder="Nom complet"
            className={`mt-1 bg-background border-border ${validations.cardHolderName === false ? "border-destructive/50" : ""}`}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Numéro de carte</Label>
            <ValidationIndicator isValid={validations.cardNumber} />
          </div>
          <Input
            value={config.cardNumber}
            onChange={(event) => setField("cardNumber", formatCardNumber(event.target.value))}
            placeholder="4111 1111 1111 1111"
            className={`mt-1 bg-background border-border ${validations.cardNumber === false ? "border-destructive/50" : ""}`}
            maxLength={23}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">Expiration</Label>
              <ValidationIndicator isValid={validations.cardExpiry} />
            </div>
            <Input
              value={config.cardExpiry}
              onChange={(event) => setField("cardExpiry", formatExpiryInput(event.target.value))}
              placeholder="MM/AA"
              className={`mt-1 bg-background border-border ${validations.cardExpiry === false ? "border-destructive/50" : ""}`}
              maxLength={5}
              disabled={!config.gainsEnabled}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">CVV</Label>
              <ValidationIndicator isValid={validations.cardCvv} />
            </div>
            <Input
              value={config.cardCvv}
              onChange={(event) => setField("cardCvv", event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              className={`mt-1 bg-background border-border ${validations.cardCvv === false ? "border-destructive/50" : ""}`}
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
  );
}
