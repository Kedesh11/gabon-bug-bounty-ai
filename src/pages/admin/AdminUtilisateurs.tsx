import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Ban, CheckCircle, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUtilisateurs() {
  const { hackers, updateHacker, deleteHacker, entreprises, updateEntreprise, deleteEntreprise } = useData();
  const [tab, setTab] = useState<"hackers" | "entreprises">("hackers");
  const [search, setSearch] = useState("");

  const filteredHackers = hackers.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
  const filteredEntreprises = entreprises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-black text-foreground">Gestion des utilisateurs</h1>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "hackers" ? "default" : "outline"} size="sm" onClick={() => setTab("hackers")}>
            Hackers ({hackers.length})
          </Button>
          <Button variant={tab === "entreprises" ? "default" : "outline"} size="sm" onClick={() => setTab("entreprises")}>
            Entreprises ({entreprises.length})
          </Button>
        </div>

        {tab === "hackers" && (
          <div className="space-y-2">
            {filteredHackers.map(h => (
              <div key={h.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{h.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      h.status === "actif" ? "bg-primary/20 text-primary" :
                      h.status === "suspendu" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-destructive/20 text-destructive"
                    }`}>{h.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{h.email} · {h.bugsFound} bugs · {h.reputation} pts</p>
                </div>
                <div className="flex items-center gap-2">
                  {h.status === "actif" ? (
                    <Button variant="outline" size="sm" onClick={() => { updateHacker(h.id, { status: "suspendu" }); toast.warning(`${h.name} suspendu`); }}>
                      <Ban className="w-3 h-3 mr-1" /> Suspendre
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { updateHacker(h.id, { status: "actif" }); toast.success(`${h.name} réactivé`); }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Activer
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => { deleteHacker(h.id); toast.error(`${h.name} supprimé`); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredHackers.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun hacker trouvé</p>}
          </div>
        )}

        {tab === "entreprises" && (
          <div className="space-y-2">
            {filteredEntreprises.map(e => (
              <div key={e.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{e.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      e.status === "actif" ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-400"
                    }`}>{e.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{e.email} · {e.sector} · {e.programmesCount} programmes</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.status === "actif" ? (
                    <Button variant="outline" size="sm" onClick={() => { updateEntreprise(e.id, { status: "suspendu" }); toast.warning(`${e.name} suspendu`); }}>
                      <Ban className="w-3 h-3 mr-1" /> Suspendre
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { updateEntreprise(e.id, { status: "actif" }); toast.success(`${e.name} réactivé`); }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Activer
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => { deleteEntreprise(e.id); toast.error(`${e.name} supprimé`); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredEntreprises.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune entreprise trouvée</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
