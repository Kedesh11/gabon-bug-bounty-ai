import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/useAuth";
import { useEntreprise, useUpdateEntreprise } from "@/hooks/api/entreprises";
import { apiErrorMessage } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

export default function EntrepriseParametres() {
  const pageTitle = useContent("entreprise.parametres.title", "Paramètres");
  const orgHeading = useContent("entreprise.parametres.org-heading", "Informations de l'organisation");
  const { user, updateProfile } = useAuth();
  const { data: profile } = useEntreprise(user?.entrepriseProfileId);
  const updateEntreprise = useUpdateEntreprise();

  const [name, setName] = useState(profile?.name || user?.name || "");
  const [sector, setSector] = useState(profile?.sector || "");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSector(profile.sector);
    }
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <h1 className="text-2xl font-black text-foreground">{pageTitle}</h1>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{orgHeading}</h3>
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
          <Button size="sm" onClick={async () => {
            if (!name.trim()) {
              toast.error("Le nom de l'organisation est requis");
              return;
            }
            if (name.trim().length < 2) {
              toast.error("Le nom est trop court");
              return;
            }
            if (!profile) return;
            try {
              await updateProfile({ name: name.trim() });
              await updateEntreprise.mutateAsync({ id: profile.id, data: { sector: sector.trim() } });
              toast.success("Paramètres sauvegardés");
            } catch (err) {
              toast.error(apiErrorMessage(err));
            }
          }}>Sauvegarder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
