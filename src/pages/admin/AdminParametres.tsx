import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminParametres() {
  const { user } = useAuth();
  const [platformName, setPlatformName] = useState("BugBounty.ga");
  const [contactEmail, setContactEmail] = useState("admin@bugbounty.ga");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-black text-foreground">Paramètres</h1>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Informations du compte</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Nom</label>
              <Input value={user?.name || ""} disabled className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Email</label>
              <Input value={user?.email || ""} disabled className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Rôle</label>
              <Input value="Administrateur" disabled className="bg-secondary border-border" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Configuration de la plateforme</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Nom de la plateforme</label>
              <Input value={platformName} onChange={e => setPlatformName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Email de contact</label>
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
          <Button size="sm" onClick={() => toast.success("Paramètres sauvegardés (démo)")}>Sauvegarder</Button>
        </div>

        <div className="glass-card rounded-xl p-5 border border-destructive/30 space-y-4">
          <h3 className="text-sm font-semibold text-destructive">Zone dangereuse</h3>
          <p className="text-xs text-muted-foreground">Réinitialiser toutes les données de la plateforme (mode démo uniquement).</p>
          <Button variant="destructive" size="sm" onClick={() => {
            localStorage.removeItem("bb_programmes");
            localStorage.removeItem("bb_reports");
            localStorage.removeItem("bb_hackers");
            localStorage.removeItem("bb_entreprises");
            toast.success("Données réinitialisées. Rechargez la page.");
          }}>Réinitialiser les données</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
