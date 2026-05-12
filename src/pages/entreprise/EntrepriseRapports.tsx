import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, CheckCircle, XCircle, DollarSign } from "lucide-react";
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

export default function EntrepriseRapports() {
  const { user } = useAuth();
  const { reports, updateReport } = useData();
  const [detail, setDetail] = useState<Report | null>(null);
  const [rewardInput, setRewardInput] = useState("");

  const myReports = reports.filter(r => r.entrepriseId === user?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-foreground">Rapports reçus</h1>

        {detail && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">{detail.hackerName} · {detail.programmeName} · {detail.createdAt}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</Button>
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
              <Button size="sm" variant="outline" onClick={() => { updateReport(detail.id, { status: "résolu" }); setDetail({ ...detail, status: "résolu" }); toast.success("Résolu"); }}>Résolu</Button>
              <div className="flex items-center gap-1">
                <Input placeholder="Récompense FCFA" value={rewardInput} onChange={e => setRewardInput(e.target.value)} className="w-36 bg-secondary border-border h-9 text-sm" />
                <Button size="sm" variant="outline" onClick={() => {
                  const v = parseInt(rewardInput);
                  if (v > 0) { updateReport(detail.id, { reward: v }); setDetail({ ...detail, reward: v }); toast.success(`${v.toLocaleString()} FCFA`); setRewardInput(""); }
                }}><DollarSign className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {myReports.map(r => (
            <div key={r.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.hackerName} · {r.programmeName}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  r.status === "accepté" || r.status === "résolu" ? "bg-primary/20 text-primary" :
                  r.status === "rejeté" ? "bg-destructive/20 text-destructive" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>{r.status}</span>
                {r.reward > 0 && <span className="text-xs font-mono text-primary">{r.reward.toLocaleString()} FCFA</span>}
                <Button variant="outline" size="sm" onClick={() => { setDetail(r); setRewardInput(""); }}><Eye className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {myReports.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun rapport reçu</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
