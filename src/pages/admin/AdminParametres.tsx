import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { 
  Settings, 
  Shield, 
  Share2, 
  Users, 
  Globe, 
  Lock, 
  Bell, 
  Slack,
  MessageSquare,
  Key,
  ShieldCheck,
  Save,
  Trash2,
  AlertTriangle,
  Mail,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Plus,
  Power
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface Integration {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  connected: boolean;
}

export default function AdminParametres() {
  const { user } = useAuth();
  const { config, updateConfig, resetPlatform } = useData();
  const [activeTab, setActiveTab] = useState("general");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Form states for general settings
  const [generalSettings, setGeneralSettings] = useState({
    platformName: config.platformName,
    contactEmail: config.contactEmail,
    supportUrl: config.supportUrl,
    autoTriage: config.autoTriage,
    enterpriseValidation: config.enterpriseValidation,
    triageLimitHours: config.triageLimitHours
  });

  // Form states for security settings
  const [securitySettings, setSecuritySettings] = useState({
    require2FA: config.require2FA,
    ipWhitelisting: config.ipWhitelisting,
    sessionTimeout: config.sessionTimeout,
    passwordComplexity: config.passwordComplexity
  });

  // Sync settings when config changes
  useEffect(() => {
    setGeneralSettings({
      platformName: config.platformName,
      contactEmail: config.contactEmail,
      supportUrl: config.supportUrl,
      autoTriage: config.autoTriage,
      enterpriseValidation: config.enterpriseValidation,
      triageLimitHours: config.triageLimitHours
    });
    setSecuritySettings({
      require2FA: config.require2FA,
      ipWhitelisting: config.ipWhitelisting,
      sessionTimeout: config.sessionTimeout,
      passwordComplexity: config.passwordComplexity
    });
  }, [config]);

  // Form states for new member
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("triage");

  // Integration states
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "slack", title: "Slack Webhooks", desc: "Envoyez des alertes en temps réel sur vos canaux de sécurité.", icon: <Slack className="w-8 h-8 text-[#4A154B]" />, connected: false },
    { id: "discord", title: "Discord Integration", desc: "Notifier la communauté des nouveaux programmes publics.", icon: <MessageSquare className="w-8 h-8 text-[#5865F2]" />, connected: true },
    { id: "google_smtp", title: "Google SMTP Relay", desc: "Service d'envoi d'emails sécurisé via Google Workspace.", icon: <Mail className="w-8 h-8 text-primary" />, connected: true },
    { id: "api", title: "API Access", desc: "Générer des clés d'accès pour l'automatisation externe.", icon: <Key className="w-8 h-8 text-accent" />, connected: false },
  ]);

  const [slackUrl, setSlackUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [googleSmtpUser, setGoogleSmtpUser] = useState("");
  const [googleSmtpPass, setGoogleSmtpPass] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleAddMember = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (newMemberName.trim().length < 2) {
      toast.error("Le nom est trop court");
      return;
    }
    if (!emailRegex.test(newMemberEmail.trim())) {
      toast.error("Format d'email invalide");
      return;
    }
    toast.success(`${newMemberName} a été ajouté à l'équipe en tant que ${newMemberRole}`);
    setIsAddMemberOpen(false);
    setNewMemberName("");
    setNewMemberEmail("");
  };

  const handleSaveGeneral = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!generalSettings.platformName.trim()) {
      toast.error("Le nom de la plateforme est requis");
      return;
    }
    if (!emailRegex.test(generalSettings.contactEmail.trim())) {
      toast.error("Format d'email de contact invalide");
      return;
    }
    updateConfig(generalSettings);
    toast.success("Paramètres généraux sauvegardés");
  };

  const handleSaveSecurity = () => {
    if (securitySettings.sessionTimeout < 5 || securitySettings.sessionTimeout > 1440) {
      toast.error("Le délai de session doit être compris entre 5 et 1440 minutes");
      return;
    }
    updateConfig(securitySettings);
    toast.success("Politiques de sécurité mises à jour");
  };

  const handleResetPlatform = () => {
    toast.loading("Réinitialisation en cours...");
    setTimeout(() => {
      resetPlatform();
    }, 2000);
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigOpen(true);
  };

  const handleConnect = () => {
    if (!selectedIntegration) return;
    
    // Simulate connection
    const promise = new Promise((resolve) => setTimeout(resolve, 1500));
    toast.promise(promise, {
      loading: "Connexion au service...",
      success: () => {
        setIntegrations(prev => prev.map(i => i.id === selectedIntegration.id ? { ...i, connected: true } : i));
        setConfigOpen(false);
        return `${selectedIntegration.title} connecté avec succès`;
      },
      error: "Erreur lors de la connexion",
    });
  };

  const handleDisconnect = () => {
    if (!selectedIntegration) return;
    setIntegrations(prev => prev.map(i => i.id === selectedIntegration.id ? { ...i, connected: false } : i));
    setConfigOpen(false);
    toast.info(`${selectedIntegration.title} déconnecté`);
  };

  const generateApiKey = () => {
    const key = `bb_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
    toast.success("Nouvelle clé API générée");
  };

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

        <Tabs defaultValue="general" className="w-full space-y-6" onValueChange={setActiveTab}>
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

          <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl border border-border p-8 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Identité de la Plateforme</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom Public</Label>
                    <Input 
                      value={generalSettings.platformName} 
                      onChange={(e) => setGeneralSettings({...generalSettings, platformName: e.target.value})}
                      className="h-12 bg-secondary/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email de Contact</Label>
                    <Input 
                      value={generalSettings.contactEmail} 
                      onChange={(e) => setGeneralSettings({...generalSettings, contactEmail: e.target.value})}
                      className="h-12 bg-secondary/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL du Support</Label>
                    <Input 
                      value={generalSettings.supportUrl} 
                      onChange={(e) => setGeneralSettings({...generalSettings, supportUrl: e.target.value})}
                      className="h-12 bg-secondary/50" 
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-border p-8 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Paramètres de Triage</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Auto-Triage IA</Label>
                      <p className="text-[10px] text-muted-foreground">Utiliser Smart-Triage™ pour pré-valider les rapports.</p>
                    </div>
                    <Switch 
                      checked={generalSettings.autoTriage} 
                      onCheckedChange={(val) => setGeneralSettings({...generalSettings, autoTriage: val})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Validation d'Entreprise Obligatoire</Label>
                      <p className="text-[10px] text-muted-foreground">L'entreprise doit valider avant tout paiement.</p>
                    </div>
                    <Switch 
                      checked={generalSettings.enterpriseValidation} 
                      onCheckedChange={(val) => setGeneralSettings({...generalSettings, enterpriseValidation: val})}
                    />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Délai Max de Triage (Heures)</Label>
                    <Input 
                      type="number" 
                      value={generalSettings.triageLimitHours} 
                      onChange={(e) => setGeneralSettings({...generalSettings, triageLimitHours: parseInt(e.target.value)})}
                      className="h-10 bg-secondary/50" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12" onClick={handleSaveGeneral}>
                <Save className="w-4 h-4" /> ENREGISTRER LES MODIFICATIONS
              </Button>
            </div>
          </TabsContent>

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
                      onCheckedChange={(val) => setSecuritySettings({...securitySettings, require2FA: val})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Whitelisting IP (Admin)</Label>
                      <p className="text-[10px] text-muted-foreground">Restreindre l'accès à certaines adresses IP.</p>
                    </div>
                    <Switch 
                      checked={securitySettings.ipWhitelisting}
                      onCheckedChange={(val) => setSecuritySettings({...securitySettings, ipWhitelisting: val})}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expiration de Session (minutes)</Label>
                    <Input 
                      type="number" 
                      value={securitySettings.sessionTimeout} 
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                      className="h-12 bg-secondary/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Complexité de Mot de Passe</Label>
                    <Select 
                      value={securitySettings.passwordComplexity} 
                      onValueChange={(val: "standard" | "elevated" | "military") => setSecuritySettings({...securitySettings, passwordComplexity: val})}
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
                <Button className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12" onClick={handleSaveSecurity}>
                  <Save className="w-4 h-4" /> APPLIQUER LES POLITIQUES
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-destructive/20 p-8 space-y-6 bg-destructive/5">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-black tracking-tight uppercase">Zone de Danger</h3>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-sm text-muted-foreground max-w-xl">
                  La réinitialisation supprimera tous les rapports, programmes et comptes utilisateurs enregistrés dans le stockage local. Cette action est irréversible.
                </p>
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="font-black px-8 h-12 shadow-lg shadow-destructive/20">
                      RÉINITIALISER LA PLATEFORME
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-destructive/20">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-destructive tracking-tighter">Réinitialisation d'Usine</DialogTitle>
                      <DialogDescription className="font-bold text-foreground">
                        Êtes-vous absolument sûr ? Cette action effacera TOUTES les données (Programmes, Rapports, Utilisateurs) définitivement.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive font-bold leading-relaxed">
                        L'application sera rafraîchie et reviendra à son état initial. Toutes vos configurations personnalisées seront perdues.
                      </p>
                    </div>
                    <DialogFooter className="gap-3 mt-4">
                      <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} className="font-bold">ANNULER</Button>
                      <Button variant="destructive" onClick={handleResetPlatform} className="font-black gap-2">
                        <Power className="w-4 h-4" /> CONFIRMER LA RÉINITIALISATION
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </TabsContent>

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

            {/* Integration Config Dialog */}
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
                          <Input 
                            type="password"
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

          <TabsContent value="team" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="glass-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                <h3 className="text-lg font-black tracking-tight">Administrateurs du Système</h3>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground font-bold h-10 px-6 gap-2">
                      <UserPlus className="w-4 h-4" /> AJOUTER UN MEMBRE
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[450px] glass-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-primary" /> Nouveau Membre
                      </DialogTitle>
                      <DialogDescription className="font-medium">
                        Invitez un nouvel administrateur à rejoindre l'équipe de gestion.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nom Complet</Label>
                        <Input 
                          placeholder="Ex: Jean Dupont" 
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="h-12 bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Adresse Email Professionnelle</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="email"
                            placeholder="jean.dupont@cyber.ga" 
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="pl-10 h-12 bg-secondary/50 border-border"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rôle & Permissions</Label>
                        <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                          <SelectTrigger className="h-12 bg-secondary/50 border-border font-bold">
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-border">
                            <SelectItem value="superadmin" className="font-bold">Super Administrateur</SelectItem>
                            <SelectItem value="triage" className="font-bold">Triage Lead</SelectItem>
                            <SelectItem value="finance" className="font-bold">Gestionnaire Finances</SelectItem>
                            <SelectItem value="support" className="font-bold">Support Technique</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Le nouveau membre recevra une invitation par email pour configurer son mot de passe et son authentification 2FA.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMemberOpen(false)} className="font-bold h-12">ANNULER</Button>
                      <Button onClick={handleAddMember} className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12">
                        ENVOYER L'INVITATION
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="divide-y divide-border">
                {[
                  { name: "Admin Principal", email: "admin@bugbounty.ga", role: "Super Admin", lastActive: "Maintenant" },
                  { name: "Sarah Koné", email: "s.kone@cyber.ga", role: "Triage Lead", lastActive: "Il y a 2h" },
                  { name: "Marc Durand", email: "m.durand@it.ga", role: "Finances", lastActive: "Il y a 1j" }
                ].map((member, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="font-bold">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <Badge variant="outline" className="font-black text-[10px] uppercase">{member.role}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">Actif: {member.lastActive}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function IntegrationCard({ 
  integration, 
  onConfigure 
}: { 
  integration: Integration, 
  onConfigure: () => void 
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
