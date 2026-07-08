import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  X,
  Trash2,
  Search,
  Bug,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  FileText,
  DollarSign,
  Activity,
  ArrowUpRight,
  Zap,
  LucideIcon
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Report } from "@/stores/dataStore";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const SEVERITY_CONFIG: Record<string, { color: string, label: string }> = {
  critique: { color: "bg-destructive text-white", label: "CRITIQUE" },
  haute: { color: "bg-orange-500 text-white", label: "HAUTE" },
  moyenne: { color: "bg-yellow-500 text-black", label: "MOYENNE" },
  faible: { color: "bg-blue-500 text-white", label: "FAIBLE" },
  info: { color: "bg-slate-500 text-white", label: "INFO" },
};

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: LucideIcon }> = {
  soumis: { label: "SOUMIS", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  en_analyse: { label: "EN ANALYSE", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Activity },
  accepté: { label: "ACCEPTÉ", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  rejeté: { label: "REJETÉ", color: "bg-destructive/10 text-destructive border-destructive/20", icon: X },
  résolu: { label: "RÉSOLU", color: "bg-primary/10 text-primary border-primary/20", icon: ShieldAlert },
};

export default function HackerRapports() {
  const { user } = useAuth();
  const { reports, deleteReport } = useData();
  const [detail, setDetail] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");

  const myReports = reports.filter(r => r.hackerId === user?.id);

  const filteredReports = useMemo(() => {
    return myReports.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.programmeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "Tous" || r.status === filterStatus;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myReports, searchTerm, filterStatus]);

  const stats = {
    total: myReports.length,
    resolved: myReports.filter(r => r.status === "résolu").length,
    pending: myReports.filter(r => r.status === "soumis" || r.status === "en_analyse").length,
    rewards: myReports.reduce((sum, r) => sum + r.reward, 0)
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter">Mes Rapports de Sécurité</h1>
            <p className="text-muted-foreground font-medium italic">Suivi en temps réel de vos soumissions et de l'analyse IA.</p>
          </div>
          <Button asChild className="h-12 px-8 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
            <Link to="/soumettre-rapport">
              <Plus className="w-5 h-5 mr-2" /> NOUVEAU RAPPORT
            </Link>
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ReportStatCard label="Total Soumis" value={stats.total} icon={<FileText />} color="text-primary" />
          <ReportStatCard label="En Cours" value={stats.pending} icon={<Clock />} color="text-yellow-500" />
          <ReportStatCard label="Résolus" value={stats.resolved} icon={<CheckCircle2 />} color="text-green-500" />
          <ReportStatCard label="Gains (XAF)" value={stats.rewards.toLocaleString()} icon={<DollarSign />} color="text-primary" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Rechercher un rapport, un programme..." 
              className="pl-12 h-12 bg-secondary/30 border-border rounded-xl font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl border border-border w-full md:w-auto">
            {["Tous", "soumis", "en_analyse", "accepté", "rejeté"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                  filterStatus === s ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "soumis" ? "En attente" : s === "en_analyse" ? "Analyse" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Reports List */}
          <div className={`space-y-4 ${detail ? "lg:col-span-6" : "lg:col-span-12"}`}>
            {filteredReports.map((r) => {
              const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.soumis;
              const severity = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.moyenne;
              
              return (
                <Card 
                  key={r.id} 
                  onClick={() => setDetail(r)}
                  className={`glass-card border-border hover:border-primary/50 transition-all cursor-pointer group overflow-hidden ${
                    detail?.id === r.id ? "ring-2 ring-primary border-transparent" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-1 self-stretch ${severity.color.split(" ")[0]}`} />
                    <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-foreground group-hover:text-primary transition-colors truncate">{r.title}</h3>
                          <Badge className={`${severity.color} text-[8px] font-black px-1.5 h-4 shadow-[0_0_10px_rgba(var(--severity-rgb),0.3)]`}>
                            {severity.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{r.programmeName}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[8px] font-black text-muted-foreground uppercase">Gains</p>
                          <p className="text-sm font-black">{r.reward > 0 ? `${r.reward.toLocaleString()} XAF` : "–"}</p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.color}`}>
                          <status.icon className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{status.label}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="text-center py-24 bg-secondary/10 rounded-[32px] border-2 border-dashed border-border">
                <Bug className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg font-bold text-muted-foreground">Aucun rapport trouvé</p>
                <Button variant="link" onClick={() => { setSearchTerm(""); setFilterStatus("Tous"); }} className="text-primary mt-2">
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>

          {/* Detailed View (Conditional) */}
          {detail && (
            <div className="lg:col-span-6 animate-in slide-in-from-right-8 fade-in duration-300">
              <Card className="glass-card border-border sticky top-24 overflow-hidden rounded-[32px] flex flex-col h-[700px]">
                <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Détails du Rapport</p>
                      <p className="text-xs font-bold font-mono">{detail.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-primary">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDetail(null)} className="rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight">{detail.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${SEVERITY_CONFIG[detail.severity].color} font-black`}>{detail.severity.toUpperCase()}</Badge>
                      <Badge variant="outline" className="font-bold">{detail.vulnerability}</Badge>
                      <Badge variant="secondary" className="font-bold">{detail.programmeName}</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Description
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/20 p-4 rounded-2xl border border-border">
                      {detail.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3" /> Preuve de Concept (PoC)
                    </h4>
                    <pre className="text-xs font-mono bg-background border border-border p-4 rounded-2xl overflow-x-auto text-primary">
                      {detail.proof}
                    </pre>
                  </div>

                  {detail.aiAnalysis && (
                    <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 space-y-4 relative overflow-hidden group/ai">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover/ai:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3 text-primary">
                          <Zap className="w-4 h-4 animate-pulse" />
                          <h4 className="text-xs font-black uppercase tracking-widest">Analyse IA Smart-Triage™</h4>
                        </div>
                        <Badge className="bg-primary text-primary-foreground font-black text-[10px] shadow-lg shadow-primary/20">
                          {Math.round(detail.aiAnalysis.confidence * 100)}% CONFIANCE
                        </Badge>
                      </div>
                      <p className="relative text-xs text-muted-foreground leading-relaxed italic">
                        "{detail.aiAnalysis.summary}"
                      </p>
                    </div>
                  )}

                  {detail.pdfFileName && (
                    <div className="p-4 rounded-2xl border border-border bg-secondary/10 flex items-center justify-between group/file">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold truncate max-w-[200px]">{detail.pdfFileName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black">Rapport PDF d'Excellence</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 group-hover/file:bg-primary group-hover/file:text-primary-foreground transition-all">
                        TÉLÉCHARGER
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border bg-secondary/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Récompense Attribuée</span>
                    <span className="text-xl font-black text-foreground">{detail.reward > 0 ? `${detail.reward.toLocaleString()} XAF` : "En attente de validation"}</span>
                  </div>
                  {detail.status === "soumis" && (
                    <Button variant="destructive" size="sm" onClick={() => { deleteReport(detail.id); setDetail(null); toast.error("Rapport supprimé"); }} className="font-bold gap-2">
                      <Trash2 className="w-4 h-4" /> SUPPRIMER
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

function ReportStatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <Card className="glass-card p-6 border-border flex items-center gap-4">
      <div className={`h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center ${color} shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
      </div>
    </Card>
  );
}
