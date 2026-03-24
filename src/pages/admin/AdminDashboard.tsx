import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { Bug, FileText, Users, Building2, TrendingUp, AlertTriangle } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <div className="glass-card rounded-xl p-5 border-glow">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
    <p className="text-2xl font-black text-foreground">{value}</p>
  </div>
);

export default function AdminDashboard() {
  const { reports, programmes, hackers, entreprises } = useData();

  const critiques = reports.filter(r => r.severity === "critique").length;
  const enAttente = reports.filter(r => r.status === "soumis" || r.status === "en_analyse").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground font-mono">Vue d'ensemble de la plateforme</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Bug} label="Rapports totaux" value={reports.length} color="bg-primary/10 text-primary" />
          <StatCard icon={FileText} label="Programmes actifs" value={programmes.filter(p => p.status === "actif").length} color="bg-accent/10 text-accent" />
          <StatCard icon={Users} label="Hackers" value={hackers.length} color="bg-info/10 text-blue-400" />
          <StatCard icon={Building2} label="Entreprises" value={entreprises.length} color="bg-warning/10 text-yellow-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5 border-glow">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Rapports en attente ({enAttente})
            </h3>
            <div className="space-y-2">
              {reports.filter(r => r.status === "soumis" || r.status === "en_analyse").slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.hackerName} · {r.programmeName}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    r.severity === "critique" ? "bg-destructive/20 text-destructive" :
                    r.severity === "haute" ? "bg-orange-500/20 text-orange-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{r.severity}</span>
                </div>
              ))}
              {enAttente === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun rapport en attente</p>}
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border-glow">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Statistiques rapides
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Vulnérabilités critiques</span>
                <span className="text-sm font-bold text-destructive">{critiques}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Taux de résolution</span>
                <span className="text-sm font-bold text-primary">
                  {reports.length ? Math.round((reports.filter(r => r.status === "résolu").length / reports.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Total récompenses</span>
                <span className="text-sm font-bold text-foreground">
                  {reports.reduce((s, r) => s + r.reward, 0).toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
