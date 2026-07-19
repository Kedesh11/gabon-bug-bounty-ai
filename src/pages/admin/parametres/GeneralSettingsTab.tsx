import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { useContent } from "@/hooks/api/content";

interface GeneralSettings {
  platformName: string;
  contactEmail: string;
  supportUrl: string;
  autoTriage: boolean;
  enterpriseValidation: boolean;
  triageLimitHours: number;
}

interface GeneralSettingsTabProps {
  generalSettings: GeneralSettings;
  setGeneralSettings: (settings: GeneralSettings) => void;
  onSave: () => void;
}

export function GeneralSettingsTab({ generalSettings, setGeneralSettings, onSave }: GeneralSettingsTabProps) {
  const identityHeading = useContent("admin.parametres.general.identity-heading", "Identité de la Plateforme");
  const triageHeading = useContent("admin.parametres.general.triage-heading", "Paramètres de Triage");
  const autoTriageHelp = useContent("admin.parametres.general.auto-triage-help", "Utiliser Smart-Triage™ pour pré-valider les rapports.");
  const enterpriseValidationHelp = useContent("admin.parametres.general.enterprise-validation-help", "L'entreprise doit valider avant tout paiement.");
  return (
    <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl border border-border p-8 space-y-6">
          <h3 className="text-lg font-black tracking-tight">{identityHeading}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom Public</Label>
              <Input
                value={generalSettings.platformName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                className="h-12 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email de Contact</Label>
              <Input
                value={generalSettings.contactEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                className="h-12 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL du Support</Label>
              <Input
                value={generalSettings.supportUrl}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportUrl: e.target.value })}
                className="h-12 bg-secondary/50"
              />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-border p-8 space-y-6">
          <h3 className="text-lg font-black tracking-tight">{triageHeading}</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Auto-Triage IA</Label>
                <p className="text-[10px] text-muted-foreground">{autoTriageHelp}</p>
              </div>
              <Switch
                checked={generalSettings.autoTriage}
                onCheckedChange={(val) => setGeneralSettings({ ...generalSettings, autoTriage: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Validation d'Entreprise Obligatoire</Label>
                <p className="text-[10px] text-muted-foreground">{enterpriseValidationHelp}</p>
              </div>
              <Switch
                checked={generalSettings.enterpriseValidation}
                onCheckedChange={(val) => setGeneralSettings({ ...generalSettings, enterpriseValidation: val })}
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Délai Max de Triage (Heures)</Label>
              <Input
                type="number"
                value={generalSettings.triageLimitHours}
                onChange={(e) => setGeneralSettings({ ...generalSettings, triageLimitHours: parseInt(e.target.value) })}
                className="h-10 bg-secondary/50"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12" onClick={onSave}>
          <Save className="w-4 h-4" /> ENREGISTRER LES MODIFICATIONS
        </Button>
      </div>
    </TabsContent>
  );
}
