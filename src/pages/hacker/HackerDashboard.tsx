import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bug, Trophy, DollarSign, TrendingUp } from "lucide-react";

export default function HackerDashboard() {
  const { user } = useAuth();
  const { reports, hackers } = useData();

  const myReports = reports.filter(r => r.hackerId === user?.id);
  const profile = hackers.find(h => h.id === user?.id);

  const totalRewards = myReports.reduce((s, r) => s + r.reward, 0);
  const accepted = myReports.filter(r => r.status === "accepté" || r.status === "résolu").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Bienvenue, {user?.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">Votre espace hacker éthique</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Bug className="w-5 h-5 text-primary" /></div>
              <p className="text-sm text-muted-foreground">Rapports soumis</p>
            </div>
            <p className="text-2xl font-black text-foreground">{myReports.length}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-accent" /></div>
              <p className="text-sm text-muted-foreground">Acceptés</p>
            </div>
            <p className="text-2xl font-black text-foreground">{accepted}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-yellow-400" /></div>
              <p className="text-sm text-muted-foreground">Récompenses</p>
            </div>
            <p className="text-2xl font-black text-foreground">{totalRewards.toLocaleString()} <span className="text-sm">FCFA</span></p>
          </div>
          <div className="glass-card rounded-xl p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              <p className="text-sm text-muted-foreground">Réputation</p>
            </div>
            <p className="text-2xl font-black text-foreground">{profile?.reputation || 0}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow">
          <h3 className="text-sm font-semibold text-foreground mb-4">Derniers rapports</h3>
          <div className="space-y-2">
            {myReports.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.programmeName} · {r.createdAt}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    r.status === "accepté" || r.status === "résolu" ? "bg-primary/20 text-primary" :
                    r.status === "rejeté" ? "bg-destructive/20 text-destructive" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
            {myReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun rapport soumis</p>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
