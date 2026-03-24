import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Bug, DollarSign, Star } from "lucide-react";

export default function HackerProfil() {
  const { user } = useAuth();
  const { hackers, updateHacker, reports } = useData();
  const profile = hackers.find(h => h.id === user?.id);
  const myReports = reports.filter(r => r.hackerId === user?.id);

  const [editName, setEditName] = useState(profile?.name || user?.name || "");
  const [editSpecialties, setEditSpecialties] = useState(profile?.specialties.join(", ") || "");

  const handleSave = () => {
    if (profile) {
      updateHacker(profile.id, { name: editName, specialties: editSpecialties.split(",").map(s => s.trim()).filter(Boolean) });
      toast.success("Profil mis à jour");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-black text-foreground">Mon profil</h1>

        <div className="glass-card rounded-xl p-5 border-glow">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-xl font-black text-foreground">{profile?.reputation || 0}</p>
              <p className="text-xs text-muted-foreground">Réputation</p>
            </div>
            <div>
              <Bug className="w-6 h-6 text-accent mx-auto mb-1" />
              <p className="text-xl font-black text-foreground">{profile?.bugsFound || myReports.length}</p>
              <p className="text-xs text-muted-foreground">Bugs trouvés</p>
            </div>
            <div>
              <DollarSign className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-black text-foreground">{(profile?.totalRewards || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">FCFA gagnés</p>
            </div>
            <div>
              <Star className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <p className="text-xl font-black text-foreground">#{profile?.rank || "–"}</p>
              <p className="text-xs text-muted-foreground">Classement</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border-glow space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Modifier mon profil</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Pseudo</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Email</label>
              <Input value={user?.email || ""} disabled className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono block mb-1">Spécialités (séparées par virgules)</label>
              <Input value={editSpecialties} onChange={e => setEditSpecialties(e.target.value)} placeholder="XSS, SQLi, IDOR" className="bg-secondary border-border" />
            </div>
          </div>
          <Button size="sm" onClick={handleSave}>Sauvegarder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
