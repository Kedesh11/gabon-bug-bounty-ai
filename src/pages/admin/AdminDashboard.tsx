import DashboardLayout from "@/components/DashboardLayout";
import { useReports } from "@/hooks/api/reports";
import { useProgrammes } from "@/hooks/api/programmes";
import { useHackers } from "@/hooks/api/hackers";
import { useEntreprises } from "@/hooks/api/entreprises";
import { useConfig, useUpdateConfig, DEFAULT_SYSTEM_CONFIG } from "@/hooks/api/config";
import { useSystemStatus, type ServiceStatus } from "@/hooks/api/systemStatus";
import { apiErrorMessage } from "@/lib/apiClient";
import { buildGrowthSeries } from "@/lib/platformGrowth";
import {
  Bug,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Activity,
  Settings,
  Database,
  Save,
  Globe,
  Bell,
  Cpu
} from "lucide-react";
import { CrowdStream } from "@/components/CrowdStream";
import { TriageQueueWidget } from "@/pages/admin/TriageQueueWidget";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AdminDashboard() {
  const { data: reports = [] } = useReports();
  const { data: programmes = [] } = useProgrammes();
  const { data: hackers = [] } = useHackers();
  const { data: entreprises = [] } = useEntreprises();
  const { data: config = DEFAULT_SYSTEM_CONFIG } = useConfig();
  const updateConfig = useUpdateConfig();
  const { data: systemStatus } = useSystemStatus();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Local temporary state for the form
  const [tempPlatformName, setTempPlatformName] = useState(config.platformName);
  const [tempAiSensitivity, setTempAiSensitivity] = useState(config.aiSensitivity);
  const [tempGlobalNotificationsEnabled, setTempGlobalNotificationsEnabled] = useState(config.globalNotificationsEnabled);

  // Maintenance mode is applied immediately (not batched with the form above) since
  // flipping it has an immediate, site-wide effect that shouldn't wait on unrelated fields.
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceDurationHours, setMaintenanceDurationHours] = useState(1);

  const totalBounties = reports.reduce((s, r) => s + r.reward, 0);
  const critiques = reports.filter(r => r.severity === "critique").length;
  const enAttente = reports.filter(r => r.status === "soumis" || r.status === "en_analyse").length;
  const resolutionRate = reports.length ? Math.round((reports.filter(r => r.status === "résolu" || r.status === "accepté").length / reports.length) * 100) : 0;

  const serviceChecks: ServiceStatus[] = systemStatus
    ? [systemStatus.database, systemStatus.auth, systemStatus.payments]
    : [];
  const availabilityPercent = systemStatus
    ? Math.round((serviceChecks.filter(s => s === "online").length / serviceChecks.length) * 100)
    : null;
  const formattedUptime = systemStatus ? formatUptime(systemStatus.uptimeSeconds) : null;

  const growthSeries = useMemo(() => buildGrowthSeries(hackers, entreprises), [hackers, entreprises]);
  const growthMax = Math.max(1, ...growthSeries.flatMap(p => [p.hackers, p.entreprises]));

  const criticalFixed = reports.filter(r => r.severity === "critique" && (r.status === "résolu" || r.status === "accepté")).length;
  const criticalFixedRate = critiques ? Math.round((criticalFixed / critiques) * 100) : 0;

  const decidedReports = reports.filter(r => r.status === "accepté" || r.status === "résolu" || r.status === "rejeté");
  const validityRate = decidedReports.length
    ? Math.round((decidedReports.filter(r => r.status !== "rejeté").length / decidedReports.length) * 100)
    : 0;

  const activeProgrammeRate = programmes.length
    ? Math.round((programmes.filter(p => p.status === "actif").length / programmes.length) * 100)
    : 0;

  const handleExportData = () => {
    const data = {
      reports,
      programmes,
      hackers,
      entreprises,
      exportDate: new Date().toISOString(),
      platform: config.platformName
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugbounty_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exportation des données JSON réussie");
  };

  const handleSaveConfig = () => {
    updateConfig.mutate(
      {
        platformName: tempPlatformName,
        aiSensitivity: tempAiSensitivity,
        globalNotificationsEnabled: tempGlobalNotificationsEnabled,
      },
      {
        onSuccess: () => {
          toast.success("Configuration mise à jour avec succès");
          setIsConfigOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const handleMaintenanceToggle = (checked: boolean) => {
    if (checked) {
      setMaintenanceDurationHours(1);
      setIsMaintenanceModalOpen(true);
      return;
    }
    updateConfig.mutate(
      { maintenanceMode: false },
      {
        onSuccess: () => toast.success("Mode maintenance désactivé"),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const handleConfirmMaintenance = () => {
    updateConfig.mutate(
      { maintenanceMode: true, maintenanceDurationHours },
      {
        onSuccess: () => {
          toast.success(`Mode maintenance activé pour ${maintenanceDurationHours}h`);
          setIsMaintenanceModalOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              Contrôle Maître
              <span className={`font-mono text-xs px-2 py-0.5 border rounded uppercase tracking-widest animate-pulse ${
                availabilityPercent === null
                  ? "text-muted-foreground bg-secondary border-border"
                  : availabilityPercent === 100
                    ? "text-primary bg-primary/10 border-primary/20"
                    : "text-destructive bg-destructive/10 border-destructive/20"
              }`}>
                {availabilityPercent === null ? "Vérification…" : availabilityPercent === 100 ? "Système Actif" : "Système Dégradé"}
              </span>
            </h1>
            <p className="text-muted-foreground font-medium italic">Vue d'ensemble granulaire de l'écosystème {config.platformName}.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={isConfigOpen} onOpenChange={(open) => {
              if (open) {
                setTempPlatformName(config.platformName);
                setTempAiSensitivity(config.aiSensitivity);
                setTempGlobalNotificationsEnabled(config.globalNotificationsEnabled);
              }
              setIsConfigOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 border-border bg-secondary/30 font-bold gap-2">
                  <Settings className="w-4 h-4" /> CONFIGURATION
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] glass-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" /> Configuration Système
                  </DialogTitle>
                  <DialogDescription className="font-medium">
                    Pilotez les paramètres globaux de la plateforme {config.platformName}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest">Nom de la Plateforme</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={tempPlatformName} 
                        onChange={(e) => setTempPlatformName(e.target.value)} 
                        className="pl-10 bg-secondary/50" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" /> Mode Maintenance
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {config.maintenanceMode && config.maintenanceUntil
                          ? `Actif — se termine à ${new Date(config.maintenanceUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                          : "Bloque l'accès à la plateforme pour tous, sauf les administrateurs."}
                      </p>
                    </div>
                    <Switch
                      checked={config.maintenanceMode}
                      onCheckedChange={handleMaintenanceToggle}
                      disabled={updateConfig.isPending}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" /> Sensibilité de l'IA (Triage)
                      </Label>
                      <span className="text-xs font-black text-primary">{tempAiSensitivity}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={tempAiSensitivity} 
                      onChange={(e) => setTempAiSensitivity(parseInt(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" /> Notifications Globales
                      </Label>
                      <p className="text-xs text-muted-foreground">Diffuser les alertes critiques à toute la plateforme.</p>
                    </div>
                    <Switch checked={tempGlobalNotificationsEnabled} onCheckedChange={setTempGlobalNotificationsEnabled} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="font-bold">ANNULER</Button>
                  <Button onClick={handleSaveConfig} className="bg-primary text-primary-foreground font-bold gap-2">
                    <Save className="w-4 h-4" /> SAUVEGARDER
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isMaintenanceModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
              <DialogContent className="sm:max-w-[420px] glass-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" /> Activer la maintenance
                  </DialogTitle>
                  <DialogDescription className="font-medium">
                    La plateforme sera inaccessible pour tous les utilisateurs (sauf les administrateurs)
                    pendant la durée indiquée. Maximum 24 heures.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Label className="text-xs font-black uppercase tracking-widest">Durée (heures)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={maintenanceDurationHours}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) return;
                      setMaintenanceDurationHours(Math.min(24, Math.max(1, value)));
                    }}
                    className="mt-2 bg-secondary/50"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMaintenanceModalOpen(false)} className="font-bold">
                    ANNULER
                  </Button>
                  <Button
                    onClick={handleConfirmMaintenance}
                    disabled={updateConfig.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" /> ACTIVER
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExportData} className="h-11 bg-primary text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20">
              <Database className="w-4 h-4" /> EXPORTER LES DONNÉES
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            
            {/* Platform Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<Users className="w-5 h-5 text-primary" />} 
                label="Utilisateurs" 
                value={(hackers.length + entreprises.length).toString()} 
                subValue={`${hackers.length} Hackers / ${entreprises.length} Ent.`}
                color="primary"
              />
              <StatCard 
                icon={<Bug className="w-5 h-5 text-accent" />} 
                label="Total Rapports" 
                value={reports.length.toString()} 
                subValue={`${enAttente} en file de triage`}
                color="accent"
              />
              <StatCard 
                icon={<DollarSign className="w-5 h-5 text-green-500" />} 
                label="Volume Bounties" 
                value={totalBounties.toLocaleString()} 
                subValue="XAF Transigés"
                color="green"
              />
              <StatCard 
                icon={<Activity className="w-5 h-5 text-orange-500" />} 
                label="Taux Résolution" 
                value={`${resolutionRate}%`} 
                subValue="Global"
                color="orange"
              />
            </div>

            {/* Growth & Financials */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Croissance Plateforme
                  </h3>
                </div>
                <div className="h-48 flex items-end justify-between gap-1 px-2">
                  {growthSeries.map((point, i) => (
                    <div key={i} className="w-full flex flex-col items-center gap-2 group">
                      <div className="flex w-full gap-0.5">
                        <div
                          className="w-1/2 bg-primary/20 group-hover:bg-primary transition-all rounded-t-sm"
                          style={{ height: `${Math.max(2, (point.hackers / growthMax) * 100)}%` }}
                          title={`${point.hackers} hackers`}
                        />
                        <div
                          className="w-1/2 bg-accent/20 group-hover:bg-accent transition-all rounded-t-sm"
                          style={{ height: `${Math.max(2, (point.entreprises / growthMax) * 100)}%` }}
                          title={`${point.entreprises} entreprises`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-2">
                  {growthSeries.map((point, i) => <span key={i}>{point.label}</span>)}
                </div>
                <div className="flex justify-center gap-6 pt-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-primary" /> Hackers</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-accent" /> Entreprises</div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Santé de la Plateforme
                </h3>
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Bugs Critiques Corrigés</span>
                      <span className="text-destructive">{criticalFixed} / {critiques}</span>
                    </div>
                    <Progress value={criticalFixedRate} className="h-1.5 bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Validité des Rapports</span>
                      <span className="text-primary">{validityRate}%</span>
                    </div>
                    <Progress value={validityRate} className="h-1.5 bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Programmes Actifs</span>
                      <span className="text-accent">{activeProgrammeRate}%</span>
                    </div>
                    <Progress value={activeProgrammeRate} className="h-1.5 bg-secondary" />
                  </div>
                </div>
              </div>
            </div>

            <TriageQueueWidget reports={reports} />
          </div>

          {/* Right Sidebar: Platform Health & Feed */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Disponibilité Système</h3>
              <div className="flex justify-center">
                <div className="relative h-24 w-24 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-secondary" />
                    <circle
                      cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent"
                      strokeDasharray="276"
                      strokeDashoffset={276 * (1 - (availabilityPercent ?? 0) / 100)}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black">{availabilityPercent !== null ? `${availabilityPercent}%` : "…"}</span>
                    <span className="text-[8px] font-bold uppercase text-primary">Disponible</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <SystemStatus label="Base de données" status={systemStatus?.database} />
                <SystemStatus label="Auth Service" status={systemStatus?.auth} />
                <SystemStatus label="Passerelle de Paiement" status={systemStatus?.payments} />
              </div>
              {formattedUptime && (
                <p className="text-center text-[9px] text-muted-foreground font-mono">API active depuis {formattedUptime}</p>
              )}
            </div>

            <CrowdStream />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, subValue, color }: { icon: React.ReactNode, label: string, value: string, subValue: string, color: string }) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10",
    accent: "bg-accent/10",
    green: "bg-green-500/10",
    orange: "bg-orange-500/10",
  };
  
  return (
    <div className="glass-card group hover:border-foreground/20 transition-all rounded-2xl p-5 border-border shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
      <div className="mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
        {subValue}
      </div>
    </div>
  );
}

function SystemStatus({ label, status }: { label: string, status?: ServiceStatus }) {
  const color = status === "online" ? "bg-green-500 animate-pulse" : status === "offline" ? "bg-destructive" : "bg-muted-foreground/40 animate-pulse";
  const text = status === "online" ? "En Ligne" : status === "offline" ? "Hors Ligne" : "Vérification…";
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
        <span className="text-[9px] font-black uppercase">{text}</span>
      </div>
    </div>
  );
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}
