import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bug, FileText, DollarSign, AlertTriangle } from "lucide-react";

export default function EntrepriseDashboard() {
  const { user } = useAuth();
  const { programmes, reports } = useData();

  const myProgrammes = programmes.filter(p => p.entrepriseId === user?.id);
  const myReports = reports.filter(r => r.entrepriseId === user?.id);
  const totalPaid = myReports.reduce((s, r) => s + r.reward, 0);
  const critiques = myReports.filter(r => r.severity === "critique").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Bienvenue, {user?.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">Votre espace entreprise</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
              <p className="text-sm text-muted-foreground">Programmes</p>
            </div>
            <p className="text-2xl font-black text-foreground">{myProgrammes.length}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Bug className="w-5 h-5 text-accent" /></div>
              <p className="text-sm text-muted-foreground">Rapports reçus</p>
            </div>
            <p className="text-2xl font-black text-foreground">{myReports.length}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <p className="text-sm text-muted-foreground">Critiques</p>
            </div>
            <p className="text-2xl font-black text-foreground">{critiques}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-yellow-400" /></div>
              <p className="text-sm text-muted-foreground">Total payé</p>
            </div>
            <p className="text-2xl font-black text-foreground">{totalPaid.toLocaleString()} <span className="text-sm">FCFA</span></p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow">
          <h3 className="text-sm font-semibold text-foreground mb-4">Derniers rapports reçus</h3>
          <div className="space-y-2">
            {myReports.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.hackerName} · {r.createdAt}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  r.severity === "critique" ? "bg-destructive/20 text-destructive" :
                  r.severity === "haute" ? "bg-orange-500/20 text-orange-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>{r.severity}</span>
              </div>
            ))}
            {myReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun rapport reçu</p>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
