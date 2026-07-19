import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HackerPaymentConfig, PreferredCurrency } from "@/types/domain";

interface PayoutPreferencesProps {
  config: HackerPaymentConfig;
  setField: <K extends keyof HackerPaymentConfig>(field: K, value: HackerPaymentConfig[K]) => void;
}

export function PayoutPreferences({ config, setField }: PayoutPreferencesProps) {
  return (
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
  );
}
