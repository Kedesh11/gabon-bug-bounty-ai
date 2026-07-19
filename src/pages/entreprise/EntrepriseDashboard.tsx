import DashboardLayout from "@/components/DashboardLayout";
import { useProgrammes } from "@/hooks/api/programmes";
import { useReports } from "@/hooks/api/reports";
import { useAuth } from "@/contexts/useAuth";
import {
  Bug,
  FileText,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  Users,
  Zap,
  LayoutDashboard,
  Timer,
  PieChart
} from "lucide-react";
import { CrowdStream } from "@/components/CrowdStream";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useContent } from "@/hooks/api/content";

export default function EntrepriseDashboard() {
  const pageTitle = useContent("entreprise.dashboard.title", "Corporate Shield");
  const slaHeading = useContent("entreprise.dashboard.sla-heading", "Performance SLA");
  const severityHeading = useContent("entreprise.dashboard.severity-heading", "Répartition par Sévérité");
  const programmesHeading = useContent("entreprise.dashboard.programmes-heading", "État des Programmes");
  const topResearchersHeading = useContent("entreprise.dashboard.top-researchers-heading", "Top Chercheurs");
  const healthScoreHeading = useContent("entreprise.dashboard.health-score-heading", "Score de Santé Sécurité");
  const { user } = useAuth();
  const { data: programmes = [] } = useProgrammes();
  const { data: myReports = [] } = useReports();

  const myProgrammes = programmes.filter(p => p.entrepriseId === user?.entrepriseProfileId);
  const totalPaid = myReports.reduce((s, r) => s + r.reward, 0);
  
  const stats = {
    critique: myReports.filter(r => r.severity === "critique").length,
    haute: myReports.filter(r => r.severity === "haute").length,
    moyenne: myReports.filter(r => r.severity === "moyenne").length,
    faible: myReports.filter(r => r.severity === "faible").length,
  };

  const pendingReports = myReports.filter(r => r.status === "soumis" || r.status === "en_analyse").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              {pageTitle} <span className="text-green-500 font-mono text-sm px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded uppercase tracking-widest italic">Monitoring Active</span>
            </h1>
            <p className="text-muted-foreground font-medium">Dashboard de pilotage pour <span className="text-foreground font-bold">{user?.name}</span>.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="h-11 border-border bg-secondary/50 font-bold gap-2">
              <Link to="/entreprise/rapports">
                <FileText className="w-4 h-4" /> TOUS LES RAPPORTS
              </Link>
            </Button>
            <Button asChild className="h-11 bg-primary text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20">
              <Link to="/soumettre-programme">
                <Zap className="w-4 h-4" /> LANCER UN PROGRAMME
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<BarChart3 className="w-5 h-5 text-primary" />} 
                label="Programmes Actifs" 
                value={myProgrammes.length.toString()} 
                subValue="En cours de test"
                color="primary"
              />
              <StatCard 
                icon={<Bug className="w-5 h-5 text-accent" />} 
                label="Total Rapports" 
                value={myReports.length.toString()} 
                subValue={`${pendingReports} en attente`}
                color="accent"
              />
              <StatCard 
                icon={<AlertTriangle className="w-5 h-5 text-destructive" />} 
                label="Bugs Critiques" 
                value={stats.critique.toString()} 
                subValue="Action requise"
                color="destructive"
              />
              <StatCard 
                icon={<DollarSign className="w-5 h-5 text-green-500" />} 
                label="Primes Versées" 
                value={totalPaid.toLocaleString()} 
                subValue="XAF"
                color="green"
              />
            </div>

            {/* SLA & Risk Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SLA Performance */}
              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" /> {slaHeading}
                </h3>
                
                <div className="space-y-6">
                  <SLAGauge label="Temps de Triage" value="24h" target="36h" progress={65} />
                  <SLAGauge label="Temps de Première Réponse" value="12h" target="24h" progress={80} />
                  <SLAGauge label="Délai de Résolution" value="18j" target="30j" progress={55} />
                </div>
              </div>

              {/* Vulnerability Distribution */}
              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-accent" /> {severityHeading}
                </h3>
                
                <div className="space-y-4 pt-2">
                  <SeverityBar label="Critique" count={stats.critique} total={myReports.length} color="bg-destructive" />
                  <SeverityBar label="Haute" count={stats.haute} total={myReports.length} color="bg-orange-500" />
                  <SeverityBar label="Moyenne" count={stats.moyenne} total={myReports.length} color="bg-yellow-500" />
                  <SeverityBar label="Faible" count={stats.faible} total={myReports.length} color="bg-blue-500" />
                </div>
              </div>
            </div>

            {/* Active Programs & Top Researchers */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 glass-card rounded-2xl border border-border overflow-hidden">
                <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" /> {programmesHeading}
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {myProgrammes.map(p => (
                    <div key={p.id} className="p-5 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border border-border">
                          {p.logoUrl ? <img src={p.logoUrl} className="object-contain p-1" /> : <ShieldCheck className="w-5 h-5 text-primary/40" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black">{p.programType} • {p.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black">{p.reportsCount} rapports</p>
                        <p className="text-[10px] text-muted-foreground italic">Dernier il y a 2j</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> {topResearchersHeading}
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                          #{i}
                        </div>
                        <p className="text-xs font-bold">Hacker_{i}45</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black">{10 - i} BUGS</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest">Voir le leaderboard</Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: CrowdStream & Security Health */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-border p-6 space-y-6 bg-gradient-to-br from-background to-secondary/30">
              <div className="text-center space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{healthScoreHeading}</h3>
                <div className="relative inline-flex items-center justify-center">
                  <svg className="h-32 w-32">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 * 0.15} strokeLinecap="round" className="text-primary transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-3xl font-black italic text-foreground">85%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Validation</p>
                  <p className="text-sm font-black text-foreground">Rapide</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Risque</p>
                  <p className="text-sm font-black text-green-500">Bas</p>
                </div>
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
    destructive: "bg-destructive/10",
    green: "bg-green-500/10",
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

function SLAGauge({ label, value, target, progress }: { label: string, value: string, target: string, progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-lg font-black text-foreground">{value}</p>
        </div>
        <p className="text-[9px] font-bold text-primary italic">Target: {target}</p>
      </div>
      <Progress value={progress} className="h-1.5 bg-secondary" />
    </div>
  );
}

function SeverityBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-muted-foreground">{count} rapports</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
