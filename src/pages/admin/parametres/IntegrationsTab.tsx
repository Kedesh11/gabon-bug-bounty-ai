import { Globe, Plus, RefreshCw, Slack, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Integration } from "./types";
import type { useIntegrations } from "./useIntegrations";

type IntegrationsState = ReturnType<typeof useIntegrations>;

export function IntegrationsTab(props: IntegrationsState) {
  const {
    integrations,
    configOpen,
    setConfigOpen,
    selectedIntegration,
    handleConfigure,
    handleConnect,
    handleDisconnect,
    slackUrl,
    setSlackUrl,
    discordUrl,
    setDiscordUrl,
    googleSmtpUser,
    setGoogleSmtpUser,
    googleSmtpPass,
    setGoogleSmtpPass,
    apiKey,
    generateApiKey,
  } = props;

  return (
    <TabsContent value="integrations" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConfigure={() => handleConfigure(integration)}
          />
        ))}
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[500px] glass-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                {selectedIntegration?.icon}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter">
                  {selectedIntegration?.title}
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Configurez vos paramètres de connexion.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {selectedIntegration?.id === "slack" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Slack Webhook URL</Label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    className="h-12 bg-secondary/50 border-border"
                  />
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                  <Slack className="w-4 h-4 text-[#4A154B] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    Créez une application Slack et activez les "Incoming Webhooks" pour obtenir cette URL.
                  </p>
                </div>
              </div>
            )}

            {selectedIntegration?.id === "discord" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Discord Webhook URL</Label>
                  <Input
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="h-12 bg-secondary/50 border-border"
                  />
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-[#5865F2] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    Dans les paramètres de votre salon Discord, allez dans Intégrations &gt; Webhooks pour créer un connecteur.
                  </p>
                </div>
              </div>
            )}

            {selectedIntegration?.id === "google_smtp" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Serveur SMTP</Label>
                  <Input
                    defaultValue="smtp-relay.gmail.com"
                    disabled
                    className="h-12 bg-secondary/50 border-border opacity-70"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Utilisateur (Workspace)</Label>
                    <Input
                      placeholder="admin@votredomaine.ga"
                      value={googleSmtpUser}
                      onChange={(e) => setGoogleSmtpUser(e.target.value)}
                      className="h-12 bg-secondary/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mot de passe d'application</Label>
                    <PasswordInput
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={googleSmtpPass}
                      onChange={(e) => setGoogleSmtpPass(e.target.value)}
                      className="h-12 bg-secondary/50 border-border"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                  <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    Utilisez le service SMTP de Google Workspace pour une délivrabilité maximale. Assurez-vous d'avoir configuré le SPF et DKIM sur votre domaine.
                  </p>
                </div>
              </div>
            )}

            {selectedIntegration?.id === "api" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Clés API Actives</Label>
                    <Button size="sm" variant="outline" className="h-8 gap-2" onClick={generateApiKey}>
                      <Plus className="w-3 h-3" /> NOUVELLE CLÉ
                    </Button>
                  </div>

                  {apiKey ? (
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border font-mono text-xs break-all relative group">
                      {apiKey}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-2 h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                          toast.success("Clé copiée");
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-border rounded-xl text-center">
                      <p className="text-xs text-muted-foreground">Aucune clé active. Générez-en une pour commencer.</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-muted-foreground">
                    Les clés API permettent d'accéder aux rapports et statistiques via notre SDK ou API REST. Ne partagez jamais ces clés.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            {selectedIntegration?.connected ? (
              <Button variant="destructive" className="font-bold flex-1" onClick={handleDisconnect}>
                DÉCONNECTER
              </Button>
            ) : (
              <Button variant="outline" className="font-bold flex-1" onClick={() => setConfigOpen(false)}>
                ANNULER
              </Button>
            )}
            <Button className="bg-primary text-primary-foreground font-bold flex-1" onClick={handleConnect}>
              {selectedIntegration?.connected ? "METTRE À JOUR" : "CONNECTER LE SERVICE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

function IntegrationCard({
  integration,
  onConfigure,
}: {
  integration: Integration;
  onConfigure: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl border border-border p-6 flex items-start gap-4 hover:border-primary/30 transition-all group">
      <div className="shrink-0 group-hover:scale-110 transition-transform">{integration.icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm tracking-tight">{integration.title}</h4>
          <Badge className={integration.connected ? "bg-green-500/10 text-green-500" : "bg-secondary text-muted-foreground"}>
            {integration.connected ? "CONNECTÉ" : "DÉCONNECTÉ"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{integration.desc}</p>
        <div className="pt-3">
          <Button
            variant="link"
            className="p-0 h-auto text-xs font-black text-primary uppercase tracking-widest"
            onClick={onConfigure}
          >
            {integration.connected ? "Configurer" : "Se connecter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
