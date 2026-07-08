import { Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizePhoneInput } from "@/lib/paymentValidation";
import type { HackerPaymentConfig, MobileMoneyProvider } from "@/stores/dataStore";
import { ValidationIndicator } from "../ValidationIndicator";

interface MobileMoneyFieldsProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  validations: Record<string, boolean | null>;
}

export function MobileMoneyFields({ config, setField, validations }: MobileMoneyFieldsProps) {
  return (
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Numéro de téléphone</Label>
            <ValidationIndicator isValid={validations.phoneNumber} />
          </div>
          <Input
            value={config.phoneNumber}
            onChange={(event) => setField("phoneNumber", sanitizePhoneInput(event.target.value))}
            placeholder="+241 77 12 34 56"
            className={`mt-1 bg-background border-border ${validations.phoneNumber === false ? "border-destructive/50" : ""}`}
            maxLength={16}
            disabled={!config.gainsEnabled}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono text-muted-foreground">Nom du compte</Label>
          <ValidationIndicator isValid={validations.accountName} />
        </div>
        <Input
          value={config.accountName}
          onChange={(event) => setField("accountName", event.target.value)}
          placeholder="Nom complet"
          className={`mt-1 bg-background border-border ${validations.accountName === false ? "border-destructive/50" : ""}`}
          disabled={!config.gainsEnabled}
        />
      </div>
    </div>
  );
}
