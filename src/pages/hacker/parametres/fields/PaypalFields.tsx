import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HackerPaymentConfig } from "@/types/domain";
import { ValidationIndicator } from "../ValidationIndicator";

interface PaypalFieldsProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  validations: Record<string, boolean | null>;
}

export function PaypalFields({ config, setField, validations }: PaypalFieldsProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono text-muted-foreground">Email PayPal</Label>
        <ValidationIndicator isValid={validations.paypalEmail} />
      </div>
      <Input
        value={config.paypalEmail}
        onChange={(event) => setField("paypalEmail", event.target.value.trim().toLowerCase())}
        placeholder="pay@example.com"
        className={`bg-background border-border ${validations.paypalEmail === false ? "border-destructive/50" : ""}`}
        maxLength={254}
        disabled={!config.gainsEnabled}
      />
    </div>
  );
}
