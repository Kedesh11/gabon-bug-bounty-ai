import { Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SecuritySettings {
  require2FA: boolean;
  ipWhitelisting: boolean;
  sessionTimeout: number;
  passwordComplexity: "standard" | "elevated" | "military";
}

interface SecuritySettingsTabProps {
  securitySettings: SecuritySettings;
  setSecuritySettings: (settings: SecuritySettings) => void;
  onSave: () => void;
}

export function SecuritySettingsTab({
  securitySettings,
  setSecuritySettings,
  onSave,
}: SecuritySettingsTabProps) {
  return (
    <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass-card rounded-2xl border border-border p-8 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-green-500" />
          <h3 className="text-xl font-black tracking-tight">Politiques de Sécurité Globale</h3>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Authentification 2FA Obligatoire</Label>
                <p className="text-[10px] text-muted-foreground">Pour tous les comptes administrateurs et entreprises.</p>
              </div>
              <Switch
                checked={securitySettings.require2FA}
                onCheckedChange={(val) => setSecuritySettings({ ...securitySettings, require2FA: val })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Whitelisting IP (Admin)</Label>
                <p className="text-[10px] text-muted-foreground">Restreindre l'accès à certaines adresses IP.</p>
              </div>
              <Switch
                checked={securitySettings.ipWhitelisting}
                onCheckedChange={(val) => setSecuritySettings({ ...securitySettings, ipWhitelisting: val })}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expiration de Session (minutes)</Label>
              <Input
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                className="h-12 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Complexité de Mot de Passe</Label>
              <Select
                value={securitySettings.passwordComplexity}
                onValueChange={(val: "standard" | "elevated" | "military") => setSecuritySettings({ ...securitySettings, passwordComplexity: val })}
              >
                <SelectTrigger className="h-12 bg-secondary/50 border-border font-bold">
                  <SelectValue placeholder="Sélectionner la complexité" />
                </SelectTrigger>
                <SelectContent className="glass-card border-border">
                  <SelectItem value="standard" className="font-bold">Standard (8+ caractères)</SelectItem>
                  <SelectItem value="elevated" className="font-bold">Élevée (12+ car, symboles, chiffres)</SelectItem>
                  <SelectItem value="military" className="font-bold">Militaire (16+ car, rotation 30 jours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12" onClick={onSave}>
            <Save className="w-4 h-4" /> APPLIQUER LES POLITIQUES
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
