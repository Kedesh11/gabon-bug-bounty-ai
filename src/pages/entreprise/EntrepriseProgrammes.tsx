import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Programme } from "@/stores/dataStore";

export default function EntrepriseProgrammes() {
  const { user } = useAuth();
  const { programmes, addProgramme, updateProgramme, deleteProgramme } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", minReward: "", maxReward: "", scope: "" });

  const myProgrammes = programmes.filter(p => p.entrepriseId === user?.id);

  const resetForm = () => { setForm({ name: "", description: "", minReward: "", maxReward: "", scope: "" }); setShowAdd(false); setEditing(null); };

  const handleAdd = () => {
    if (!form.name) { toast.error("Le nom est obligatoire"); return; }
    addProgramme({
      name: form.name, description: form.description, entrepriseId: user?.id || "",
      entrepriseName: user?.name || "", scope: form.scope.split(",").map(s => s.trim()).filter(Boolean),
      minReward: parseInt(form.minReward) || 0, maxReward: parseInt(form.maxReward) || 0, status: "actif",
    });
    toast.success("Programme créé");
    resetForm();
  };

  const startEdit = (p: Programme) => {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description, minReward: String(p.minReward), maxReward: String(p.maxReward), scope: p.scope.join(", ") });
  };

  const handleUpdate = (id: string) => {
    updateProgramme(id, {
      name: form.name, description: form.description,
      minReward: parseInt(form.minReward) || 0, maxReward: parseInt(form.maxReward) || 0,
      scope: form.scope.split(",").map(s => s.trim()).filter(Boolean),
    });
    toast.success("Programme mis à jour");
    resetForm();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-foreground">Mes programmes</h1>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="w-4 h-4 mr-1" /> Nouveau programme</Button>
        </div>

        {(showAdd || editing) && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">{editing ? "Modifier" : "Nouveau"} programme</h3>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Nom du programme *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Scope (séparé par virgules)" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Récompense min (FCFA)" value={form.minReward} onChange={e => setForm(f => ({ ...f, minReward: e.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Récompense max (FCFA)" value={form.maxReward} onChange={e => setForm(f => ({ ...f, maxReward: e.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border md:col-span-2" />
            </div>
            <Button size="sm" onClick={() => editing ? handleUpdate(editing) : handleAdd()}>
              <Save className="w-4 h-4 mr-1" /> {editing ? "Sauvegarder" : "Créer"}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {myProgrammes.map(p => (
            <div key={p.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    p.status === "actif" ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-400"
                  }`}>{p.status}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{p.minReward.toLocaleString()} - {p.maxReward.toLocaleString()} FCFA · {p.reportsCount} rapports</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(p)}><Edit2 className="w-3 h-3" /></Button>
                {p.status === "actif" ? (
                  <Button variant="outline" size="sm" onClick={() => { updateProgramme(p.id, { status: "pause" }); toast.info("Mis en pause"); }}>Pause</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { updateProgramme(p.id, { status: "actif" }); toast.success("Activé"); }}>Activer</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => { deleteProgramme(p.id); toast.error("Supprimé"); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {myProgrammes.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun programme créé</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
