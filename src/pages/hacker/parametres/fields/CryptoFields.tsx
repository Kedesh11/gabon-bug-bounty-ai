import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CryptoType, HackerPaymentConfig } from "@/types/domain";
import { ValidationIndicator } from "../ValidationIndicator";

interface CryptoFieldsProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
  validations: Record<string, boolean | null>;
}

export function CryptoFields({ config, setField, validations }: CryptoFieldsProps) {
  return (
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
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono text-muted-foreground">Adresse wallet</Label>
          <ValidationIndicator isValid={validations.walletAddress} />
        </div>
        <Input
          value={config.walletAddress}
          onChange={(event) => setField("walletAddress", event.target.value)}
          placeholder="Adresse de réception"
          className={`mt-1 bg-background border-border ${validations.walletAddress === false ? "border-destructive/50" : ""}`}
          maxLength={128}
          disabled={!config.gainsEnabled}
        />
      </div>
    </div>
  );
}
