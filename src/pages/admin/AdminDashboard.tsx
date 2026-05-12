import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { 
  Bug, 
  FileText, 
  Users, 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Settings,
  Database,
  Search,
  ArrowUpRight,
  PieChart as PieChartIcon,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Save,
  Globe,
  Bell,
  Cpu
} from "lucide-react";
import { CrowdStream } from "@/components/CrowdStream";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
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
  const { reports, programmes, hackers, entreprises, config, updateConfig } = useData();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Local temporary state for the form
  const [tempPlatformName, setTempPlatformName] = useState(config.platformName);
  const [tempMaintenanceMode, setTempMaintenanceMode] = useState(config.maintenanceMode);
  const [tempAiSensitivity, setTempAiSensitivity] = useState(config.aiSensitivity);

  const totalBounties = reports.reduce((s, r) => s + r.reward, 0);
  const critiques = reports.filter(r => r.severity === "critique").length;
  const enAttente = reports.filter(r => r.status === "soumis" || r.status === "en_analyse").length;
  const resolutionRate = reports.length ? Math.round((reports.filter(r => r.status === "résolu" || r.status === "accepté").length / reports.length) * 100) : 0;

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
    updateConfig({
      platformName: tempPlatformName,
      maintenanceMode: tempMaintenanceMode,
      aiSensitivity: tempAiSensitivity
    });
    toast.success("Configuration mise à jour avec succès");
    setIsConfigOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              Contrôle Maître <span className="text-primary font-mono text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded uppercase tracking-widest animate-pulse">Système Actif</span>
            </h1>
            <p className="text-muted-foreground font-medium italic">Vue d'ensemble granulaire de l'écosystème {config.platformName}.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={isConfigOpen} onOpenChange={(open) => {
              if (open) {
                setTempPlatformName(config.platformName);
                setTempMaintenanceMode(config.maintenanceMode);
                setTempAiSensitivity(config.aiSensitivity);
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
                      <p className="text-xs text-muted-foreground">Bloque les nouvelles soumissions de rapports.</p>
                    </div>
                    <Switch checked={tempMaintenanceMode} onCheckedChange={setTempMaintenanceMode} />
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
                      <p className="text-xs text-muted-foreground">Activer les alertes critiques pour les admins.</p>
                    </div>
                    <Switch defaultChecked />
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
                  {[20, 35, 25, 45, 60, 85, 100].map((h, i) => (
                    <div key={i} className="w-full flex flex-col items-center gap-2 group">
                      <div className="flex w-full gap-0.5">
                        <div className="w-1/2 bg-primary/20 group-hover:bg-primary transition-all rounded-t-sm" style={{ height: `${h}%` }} />
                        <div className="w-1/2 bg-accent/20 group-hover:bg-accent transition-all rounded-t-sm" style={{ height: `${h * 0.7}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-2">
                  <span>Jan</span><span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Juin</span><span>Juil</span>
                </div>
                <div className="flex justify-center gap-6 pt-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-primary" /> Hackers</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-accent" /> Entreprises</div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> État des Vulnérabilités
                </h3>
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Bugs Critiques (Corrigés)</span>
                      <span className="text-destructive">{critiques} détectés</span>
                    </div>
                    <Progress value={82} className="h-1.5 bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Validité des Rapports</span>
                      <span className="text-primary">74% Précision</span>
                    </div>
                    <Progress value={74} className="h-1.5 bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Satisfaction Partenaires</span>
                      <span className="text-accent">9.2 / 10</span>
                    </div>
                    <Progress value={92} className="h-1.5 bg-secondary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Global Triage Queue */}
            <div className="glass-card rounded-2xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" /> File de Triage Global (Priorité IA)
                </h3>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7">GÉRER LA FILE</Button>
              </div>
              <div className="divide-y divide-border">
                {reports.filter(r => r.status === "soumis" || r.status === "en_analyse").slice(0, 5).map(r => (
                  <div key={r.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        r.severity === "critique" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{r.hackerName} ➜ {r.programmeName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={
                        r.severity === "critique" ? "bg-destructive text-destructive-foreground" : 
                        r.severity === "haute" ? "bg-orange-500 text-white" : "bg-yellow-500 text-black"
                      }>
                        {r.severity.toUpperCase()}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-border group-hover:border-primary/50 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Platform Health & Feed */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Disponibilité Système</h3>
              <div className="flex justify-center">
                <div className="relative h-24 w-24 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-secondary" />
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="276" strokeDashoffset={276 * 0.01} strokeLinecap="round" className="text-primary" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black">99.9</span>
                    <span className="text-[8px] font-bold uppercase text-primary">Uptime</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <SystemStatus label="Auth Service" status="online" />
                <SystemStatus label="AI Triage Engine" status="online" />
                <SystemStatus label="Payment Gateway" status="online" />
              </div>
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

function SystemStatus({ label, status }: { label: string, status: "online" | "warning" | "offline" }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${status === "online" ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
        <span className="text-[9px] font-black uppercase">{status === "online" ? "En Ligne" : "Hors Ligne"}</span>
      </div>
    </div>
  );
}
