import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export default function EntrepriseParametres() {
  const { user } = useAuth();
  const { entreprises, updateEntreprise } = useData();
  const profile = entreprises.find(e => e.id === user?.id);

  const [name, setName] = useState(profile?.name || user?.name || "");
  const [sector, setSector] = useState(profile?.sector || "");

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <h1 className="text-2xl font-black text-foreground">Paramètres</h1>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Informations de l'organisation</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Nom de l'organisation</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Email</label>
              <Input value={user?.email || ""} disabled className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Secteur d'activité</label>
              <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Finance, Gouvernement, Télécoms..." className="bg-secondary border-border" />
            </div>
          </div>
          <Button size="sm" onClick={() => {
            if (!name.trim()) {
              toast.error("Le nom de l'organisation est requis");
              return;
            }
            if (name.trim().length < 2) {
              toast.error("Le nom est trop court");
              return;
            }
            if (profile) { updateEntreprise(profile.id, { name: name.trim(), sector: sector.trim() }); }
            toast.success("Paramètres sauvegardés");
          }}>Sauvegarder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
