import { Globe, Settings, Share2, Shield, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGeneralSettings } from "./parametres/useGeneralSettings";
import { useSecuritySettings } from "./parametres/useSecuritySettings";
import { useIntegrations } from "./parametres/useIntegrations";
import { useTeamMembers } from "./parametres/useTeamMembers";
import { GeneralSettingsTab } from "./parametres/GeneralSettingsTab";
import { SecuritySettingsTab } from "./parametres/SecuritySettingsTab";
import { IntegrationsTab } from "./parametres/IntegrationsTab";
import { TeamTab } from "./parametres/TeamTab";

export default function AdminParametres() {
  const general = useGeneralSettings();
  const security = useSecuritySettings();
  const integrations = useIntegrations();
  const team = useTeamMembers();

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter">Configuration Système</h1>
            <p className="text-sm text-muted-foreground">Gérez les politiques globales et les intégrations de la plateforme.</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-2xl border border-border h-14 w-full justify-start gap-2">
            <TabsTrigger value="general" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <Globe className="w-4 h-4" /> Général
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <Shield className="w-4 h-4" /> Sécurité
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <Share2 className="w-4 h-4" /> Intégrations
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <Users className="w-4 h-4" /> Équipe
            </TabsTrigger>
          </TabsList>

          <GeneralSettingsTab
            generalSettings={general.generalSettings}
            setGeneralSettings={general.setGeneralSettings}
            onSave={general.handleSaveGeneral}
          />

          <SecuritySettingsTab
            securitySettings={security.securitySettings}
            setSecuritySettings={security.setSecuritySettings}
            onSave={security.handleSaveSecurity}
          />

          <IntegrationsTab {...integrations} />

          <TeamTab {...team} />
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
