import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle, XCircle, Eye, Search, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Report } from "@/stores/dataStore";

const SEVERITY_COLORS: Record<string, string> = {
  critique: "bg-destructive/20 text-destructive",
  haute: "bg-orange-500/20 text-orange-400",
  moyenne: "bg-yellow-500/20 text-yellow-400",
  faible: "bg-blue-500/20 text-blue-400",
  info: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  soumis: "bg-blue-500/20 text-blue-400",
  en_analyse: "bg-yellow-500/20 text-yellow-400",
  accepté: "bg-primary/20 text-primary",
  rejeté: "bg-destructive/20 text-destructive",
  résolu: "bg-accent/20 text-accent",
};

export default function AdminRapports() {
  const { reports, updateReport, deleteReport } = useData();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Report | null>(null);
  const [rewardInput, setRewardInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = reports
    .filter(r => filterStatus === "all" || r.status === filterStatus)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.hackerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-foreground">Gestion des rapports</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            <option value="all">Tous les statuts</option>
            <option value="soumis">Soumis</option>
            <option value="en_analyse">En analyse</option>
            <option value="accepté">Accepté</option>
            <option value="rejeté">Rejeté</option>
            <option value="résolu">Résolu</option>
          </select>
        </div>

        {detail && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">{detail.hackerName} · {detail.programmeName} · {detail.createdAt}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded font-mono ${SEVERITY_COLORS[detail.severity]}`}>{detail.severity}</span>
              <span className={`text-xs px-2 py-1 rounded font-mono ${STATUS_COLORS[detail.status]}`}>{detail.status}</span>
            </div>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground">{detail.description}</p>
              <p className="text-xs text-muted-foreground font-mono">Type: {detail.vulnerability}</p>
              <p className="text-xs text-muted-foreground font-mono">Preuve: {detail.proof}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { updateReport(detail.id, { status: "accepté" }); setDetail({ ...detail, status: "accepté" }); toast.success("Rapport accepté"); }}>
                <CheckCircle className="w-3 h-3 mr-1" /> Accepter
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { updateReport(detail.id, { status: "rejeté" }); setDetail({ ...detail, status: "rejeté" }); toast.error("Rapport rejeté"); }}>
                <XCircle className="w-3 h-3 mr-1" /> Rejeter
              </Button>
              <Button size="sm" variant="outline" onClick={() => { updateReport(detail.id, { status: "résolu" }); setDetail({ ...detail, status: "résolu" }); toast.success("Rapport résolu"); }}>
                Résolu
              </Button>
              <div className="flex items-center gap-1">
                <Input placeholder="Récompense FCFA" value={rewardInput} onChange={e => setRewardInput(e.target.value)} className="w-36 bg-secondary border-border h-9 text-sm" />
                <Button size="sm" variant="outline" onClick={() => {
                  const v = parseInt(rewardInput);
                  if (v > 0) { updateReport(detail.id, { reward: v }); setDetail({ ...detail, reward: v }); toast.success(`Récompense: ${v.toLocaleString()} FCFA`); setRewardInput(""); }
                }}>
                  <DollarSign className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.hackerName} · {r.programmeName} · {r.createdAt}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                {r.reward > 0 && <span className="text-xs font-mono text-primary">{r.reward.toLocaleString()} FCFA</span>}
                <Button variant="outline" size="sm" onClick={() => { setDetail(r); setRewardInput(""); }}><Eye className="w-3 h-3" /></Button>
                <Button variant="destructive" size="sm" onClick={() => { deleteReport(r.id); toast.error("Rapport supprimé"); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun rapport trouvé</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
