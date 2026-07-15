import { Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeAlphaNumeric } from "@/lib/paymentValidation";
import type { HackerPaymentConfig } from "@/types/domain";
import { ValidationIndicator } from "../ValidationIndicator";

interface BankTransferFieldsProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  validations: Record<string, boolean | null>;
}

export function BankTransferFields({ config, setField, validations }: BankTransferFieldsProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
      <p className="text-xs font-mono text-primary flex items-center gap-1">
        <Landmark className="w-3 h-3" /> Transfert bancaire
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Nom de banque</Label>
            <ValidationIndicator isValid={validations.bankName} />
          </div>
          <Input
            value={config.bankName}
            onChange={(event) => setField("bankName", event.target.value)}
            className={`mt-1 bg-background border-border ${validations.bankName === false ? "border-destructive/50" : ""}`}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Titulaire du compte</Label>
            <ValidationIndicator isValid={validations.accountHolderName} />
          </div>
          <Input
            value={config.accountHolderName}
            onChange={(event) => setField("accountHolderName", event.target.value)}
            className={`mt-1 bg-background border-border ${validations.accountHolderName === false ? "border-destructive/50" : ""}`}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">Numéro de compte</Label>
            <ValidationIndicator isValid={validations.accountNumber} />
          </div>
          <Input
            value={config.accountNumber}
            onChange={(event) => setField("accountNumber", sanitizeAlphaNumeric(event.target.value))}
            className={`mt-1 bg-background border-border ${validations.accountNumber === false ? "border-destructive/50" : ""}`}
            maxLength={34}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">IBAN (optionnel)</Label>
            <ValidationIndicator isValid={validations.iban} />
          </div>
          <Input
            value={config.iban}
            onChange={(event) => setField("iban", sanitizeAlphaNumeric(event.target.value))}
            className={`mt-1 bg-background border-border ${validations.iban === false ? "border-destructive/50" : ""}`}
            maxLength={34}
            disabled={!config.gainsEnabled}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono text-muted-foreground">SWIFT code (optionnel)</Label>
            <ValidationIndicator isValid={validations.swiftCode} />
          </div>
          <Input
            value={config.swiftCode}
            onChange={(event) => setField("swiftCode", sanitizeAlphaNumeric(event.target.value))}
            className={`mt-1 bg-background border-border ${validations.swiftCode === false ? "border-destructive/50" : ""}`}
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
  );
}
