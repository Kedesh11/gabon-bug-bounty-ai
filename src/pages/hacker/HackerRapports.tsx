import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Save, Eye, Trash2 } from "lucide-react";
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

export default function HackerRapports() {
  const { user } = useAuth();
  const { reports, addReport, deleteReport, programmes } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<Report | null>(null);
  const [form, setForm] = useState({ title: "", description: "", severity: "moyenne" as Report["severity"], programmeId: "", vulnerability: "", proof: "" });

  const myReports = reports.filter(r => r.hackerId === user?.id);

  const handleSubmit = () => {
    if (!form.title || !form.programmeId || !form.vulnerability) { toast.error("Remplissez les champs obligatoires"); return; }
    const prog = programmes.find(p => p.id === form.programmeId);
    addReport({
      title: form.title, description: form.description, severity: form.severity,
      hackerId: user?.id || "", hackerName: user?.name || "",
      programmeId: form.programmeId, programmeName: prog?.name || "",
      entrepriseId: prog?.entrepriseId || "",
      vulnerability: form.vulnerability, proof: form.proof,
    });
    toast.success("Rapport soumis avec succès !");
    setForm({ title: "", description: "", severity: "moyenne", programmeId: "", vulnerability: "", proof: "" });
    setShowAdd(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-foreground">Mes rapports</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Nouveau rapport</Button>
        </div>

        {showAdd && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">Soumettre une vulnérabilité</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Titre de la vulnérabilité *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
              <select value={form.programmeId} onChange={e => setForm(f => ({ ...f, programmeId: e.target.value }))}
                className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="">Programme cible *</option>
                {programmes.filter(p => p.status === "actif").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input placeholder="Type de vulnérabilité * (XSS, SQLi, etc.)" value={form.vulnerability} onChange={e => setForm(f => ({ ...f, vulnerability: e.target.value }))} className="bg-secondary border-border" />
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as Report["severity"] }))}
                className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="info">Info</option>
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
              <textarea placeholder="Description détaillée" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground md:col-span-2 min-h-[80px]" />
              <textarea placeholder="Preuve / étapes de reproduction" value={form.proof} onChange={e => setForm(f => ({ ...f, proof: e.target.value }))}
                className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground md:col-span-2 min-h-[60px]" />
            </div>
            <Button size="sm" onClick={handleSubmit}><Save className="w-4 h-4 mr-1" /> Soumettre</Button>
          </div>
        )}

        {detail && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-foreground">{detail.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</Button>
            </div>
            <div className="flex gap-2"><span className={`text-xs px-2 py-1 rounded font-mono ${SEVERITY_COLORS[detail.severity]}`}>{detail.severity}</span></div>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground">{detail.description}</p>
              <p className="text-xs text-muted-foreground font-mono">Vulnérabilité: {detail.vulnerability}</p>
              <p className="text-xs text-muted-foreground font-mono">Preuve: {detail.proof}</p>
            </div>
            {detail.reward > 0 && <p className="text-sm font-mono text-primary font-bold">Récompense: {detail.reward.toLocaleString()} FCFA</p>}
          </div>
        )}

        <div className="space-y-2">
          {myReports.map(r => (
            <div key={r.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.programmeName} · {r.createdAt}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  r.status === "accepté" || r.status === "résolu" ? "bg-primary/20 text-primary" :
                  r.status === "rejeté" ? "bg-destructive/20 text-destructive" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>{r.status}</span>
                {r.reward > 0 && <span className="text-xs font-mono text-primary">{r.reward.toLocaleString()} FCFA</span>}
                <Button variant="outline" size="sm" onClick={() => setDetail(r)}><Eye className="w-3 h-3" /></Button>
                {r.status === "soumis" && (
                  <Button variant="destructive" size="sm" onClick={() => { deleteReport(r.id); toast.error("Rapport supprimé"); }}><Trash2 className="w-3 h-3" /></Button>
                )}
              </div>
            </div>
          ))}
          {myReports.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun rapport soumis. Commencez par explorer les programmes !</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
