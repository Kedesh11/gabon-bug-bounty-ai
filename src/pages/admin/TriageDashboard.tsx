import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { 
  Bug, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Zap,
  Code2,
  ChevronRight,
  Terminal,
  Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function TriageDashboard() {
  const { reports } = useData();
  const pendingReports = reports.filter(r => r.status === "soumis" || r.status === "en_analyse");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
              <Terminal className="w-8 h-8 text-primary" /> Triage Control Center
            </h1>
            <p className="text-muted-foreground">Validation technique et analyse de sévérité des vulnérabilités.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Capacité IA</p>
              <Progress value={85} className="h-1.5 w-32 bg-secondary" />
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 py-1.5 px-3 font-black">
              LIVE TRIAGE
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-4">
            <StatSmall label="En Attente" value={pendingReports.length} color="text-primary" icon={<Clock className="w-4 h-4" />} />
            <StatSmall label="Précision IA" value="94.2%" color="text-green-500" icon={<Brain className="w-4 h-4" />} />
            <StatSmall label="Temps Moyen" value="4.2h" color="text-accent" icon={<Zap className="w-4 h-4" />} />
            
            <Card className="glass-card p-5 border-border space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Priorités de la journée</h3>
              <div className="space-y-3">
                <PriorityItem label="RCE critique (SEEG)" severity="critique" />
                <PriorityItem label="SQLi potentielle" severity="haute" />
                <PriorityItem label="Bypass Auth" severity="haute" />
              </div>
            </Card>
          </div>

          {/* Main Triage Queue */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Filtrer par vulnérabilité, CWE ou hacker..." className="pl-10 h-12 bg-secondary/30 border-border" />
            </div>

            <div className="glass-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> File d'attente active
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px]">Toutes les sévérités</Badge>
                  <Badge variant="outline" className="text-[10px]">Plus récents</Badge>
                </div>
              </div>
              <div className="divide-y divide-border">
                {pendingReports.map((r) => (
                  <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-primary/5 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                        r.severity === "critique" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`}>
                        <Bug className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold truncate group-hover:text-primary transition-colors">{r.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-muted-foreground uppercase">{r.programmeName}</span>
                          <Badge variant="outline" className="text-[9px] font-bold py-0 h-4">{r.hackerName}</Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">{r.createdAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <Badge className={
                        r.severity === "critique" ? "bg-destructive text-destructive-foreground" : 
                        r.severity === "haute" ? "bg-orange-500 text-white" : "bg-yellow-500 text-black"
                      }>
                        {r.severity.toUpperCase()}
                      </Badge>
                      <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl group-hover:border-primary transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatSmall({ label, value, color, icon }: { label: string, value: string | number, color: string, icon: React.ReactNode }) {
  return (
    <Card className="glass-card p-4 border-border flex items-center justify-between group hover:border-primary/30 transition-all">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
      </div>
      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </Card>
  );
}

function PriorityItem({ label, severity }: { label: string, severity: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] p-2 rounded-lg bg-secondary/50 border border-border/50">
      <span className="font-bold truncate">{label}</span>
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${severity === "critique" ? "bg-destructive" : "bg-orange-500"}`} />
    </div>
  );
}
