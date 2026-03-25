import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HackerProgrammes() {
  const { programmes } = useData();
  const actifs = programmes.filter(p => p.status === "actif");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Programmes disponibles</h1>
          <p className="text-sm text-muted-foreground font-mono">{actifs.length} programmes actifs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actifs.map(p => (
            <div key={p.id} className="glass-card rounded-xl p-5 border-glow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{p.entrepriseName}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-primary/20 text-primary">actif</span>
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="flex flex-wrap gap-1">
                {p.scope.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{s}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-primary font-mono font-bold">
                  {p.minReward.toLocaleString()} - {p.maxReward.toLocaleString()} FCFA
                </span>
                <div className="flex items-center gap-2">
                  <Link to={`/programmes/${p.id}`}>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3 h-3 mr-1" /> Voir
                    </Button>
                  </Link>
                  <Link to={`/hacker/rapports?programme=${p.id}`}>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3 h-3 mr-1" /> Soumettre un bug
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
