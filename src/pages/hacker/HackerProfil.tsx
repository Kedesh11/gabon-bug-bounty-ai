import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Trophy, 
  Bug, 
  DollarSign, 
  Star, 
  ShieldCheck, 
  Target, 
  Zap, 
  UserCircle2, 
  Camera,
  MapPin,
  Link as LinkIcon,
  Twitter,
  Github,
  Mail,
  Award,
  Medal,
  Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

export default function HackerProfil() {
  const { user } = useAuth();
  const { hackers, updateHacker, reports } = useData();
  const profile = hackers.find(h => h.id === user?.id);
  const myReports = reports.filter(r => r.hackerId === user?.id);

  const [editName, setEditName] = useState(profile?.name || user?.name || "");
  const [editSpecialties, setEditSpecialties] = useState(profile?.specialties.join(", ") || "");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const validations = {
    name: editName.trim().length >= 3 && editName.trim().length <= 30,
    specialties: editSpecialties.split(",").map(s => s.trim()).filter(Boolean).length <= 10,
    bio: editBio.length <= 500,
  };

  const handleSave = () => {
    if (!validations.name) {
      toast.error("Le pseudonyme doit faire entre 3 et 30 caractères");
      return;
    }
    if (!validations.specialties) {
      toast.error("Maximum 10 spécialités autorisées");
      return;
    }
    if (!validations.bio) {
      toast.error("La bio ne doit pas dépasser 500 caractères");
      return;
    }

    if (profile) {
      setIsSaving(true);
      setTimeout(() => {
        updateHacker(profile.id, { 
          name: editName.trim(), 
          specialties: editSpecialties.split(",").map(s => s.trim()).filter(Boolean) 
        });
        setIsSaving(false);
        toast.success("Profil mis à jour avec succès");
      }, 1000);
    }
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/hacker/public-profile/${profile?.id || user?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Lien du profil copié dans le presse-papier !");
    }).catch(() => {
      toast.error("Erreur lors de la copie du lien");
    });
  };

  const totalRewards = myReports.reduce((s, r) => s + r.reward, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-[40px] border border-border bg-card shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse-slow" />
          
          <div className="relative pt-12 px-8 pb-8 flex flex-col md:flex-row items-end gap-8">
            <div className="relative group">
              <div className="h-32 w-32 rounded-[32px] bg-background border-4 border-card p-1 shadow-2xl relative overflow-hidden">
                <div className="w-full h-full rounded-[26px] bg-secondary flex items-center justify-center overflow-hidden">
                  <UserCircle2 className="w-16 h-16 text-primary/40" />
                </div>
                <button className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-primary flex items-center justify-center border-4 border-card shadow-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tighter">{profile?.name}</h1>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">ÉLITE VANGUARD</Badge>
                </div>
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {user?.email}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <MapPin className="w-3 h-3" /> Libreville, Gabon
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <Github className="w-3 h-3" /> @{profile?.name?.toLowerCase().replace(" ", "")}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <Twitter className="w-3 h-3" /> @{profile?.name?.toLowerCase().replace(" ", "")}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex gap-3">
              <Button variant="outline" onClick={handleShareProfile} className="h-12 px-6 rounded-2xl font-bold border-border">PARTAGER PROFIL</Button>
              <Button className="h-12 px-8 rounded-2xl font-black bg-primary text-primary-foreground shadow-xl shadow-primary/20">RANK #23</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats & Badges */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Detailed Stats */}
            <Card className="glass-card p-8 rounded-[32px] border-border space-y-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Statistiques Vitales</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Trophy className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Réputation</p>
                      <p className="text-xl font-black">{profile?.reputation || 0}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">+120</Badge>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform"><Bug className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Bugs Validés</p>
                      <p className="text-xl font-black">{profile?.bugsFound || myReports.length}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">100% S.R</Badge>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform"><DollarSign className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Gains Totaux</p>
                      <p className="text-xl font-black">{totalRewards.toLocaleString()} XAF</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">TOP 5%</Badge>
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span>Niveau 14 : Spectre</span>
                  <span className="text-primary">8,450 / 10,000 XP</span>
                </div>
                <Progress value={84} className="h-2 bg-secondary" />
              </div>
            </Card>

            {/* Badges Collection */}
            <Card className="glass-card p-8 rounded-[32px] border-border space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent">Succès & Badges</h3>
              <div className="grid grid-cols-4 gap-4">
                <BadgeItem icon={<Zap className="text-yellow-400" />} label="First Blood" />
                <BadgeItem icon={<ShieldCheck className="text-blue-400" />} label="Périmètre Sûr" />
                <BadgeItem icon={<Target className="text-destructive" />} label="Sniper" />
                <BadgeItem icon={<Award className="text-primary" />} label="Vétéran" />
                <BadgeItem icon={<Medal className="text-orange-400" />} label="Excellence" />
                <div className="aspect-square rounded-2xl bg-secondary/30 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/30 text-xs font-bold">+3</div>
              </div>
            </Card>
          </div>

          {/* Right Column: Settings & Specialization */}
          <div className="lg:col-span-8 space-y-8">
            
            <Card className="glass-card p-10 rounded-[40px] border-border space-y-10">
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Configuration du Profil</h2>
                <p className="text-sm text-muted-foreground">Gérez votre identité publique sur Gabon Bug Bounty AI.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pseudonyme de Recherche</label>
                  <Input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className={`h-14 bg-secondary/50 border-border text-lg font-bold rounded-2xl px-6 focus:ring-primary/20 ${editName && !validations.name ? "border-destructive/50" : ""}`}
                    maxLength={30}
                  />
                  {!validations.name && editName !== "" && <p className="text-[10px] text-destructive font-bold">3-30 caractères requis</p>}
                  <p className="text-[10px] text-muted-foreground italic">C'est le nom qui sera affiché sur les leaderboards.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email de Sécurité (Non modifiable)</label>
                  <Input 
                    value={user?.email || ""} 
                    disabled 
                    className="h-14 bg-secondary/20 border-border text-muted-foreground font-mono rounded-2xl px-6" 
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expertise & Spécialités</label>
                  <Input 
                    value={editSpecialties} 
                    onChange={e => setEditSpecialties(e.target.value)} 
                    placeholder="XSS, SQL Injection, Cloud Security, API Penetration Testing..." 
                    className="h-14 bg-secondary/50 border-border font-bold rounded-2xl px-6 focus:ring-primary/20" 
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {editSpecialties.split(",").map(s => s.trim()).filter(Boolean).map(tag => (
                      <Badge key={tag} className="bg-primary/5 text-primary border-primary/20 font-bold">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bio de Chercheur (Executive Summary)</label>
                  <textarea 
                    className={`w-full h-32 bg-secondary/50 border border-border rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all ${!validations.bio ? "border-destructive/50" : ""}`}
                    placeholder="Décrivez votre parcours, vos certifications et vos domaines de prédilection..."
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    maxLength={500}
                  />
                  <div className="flex justify-between">
                    <p className="text-[10px] text-muted-foreground italic">Max 500 caractères.</p>
                    <p className={`text-[10px] font-bold ${editBio.length > 450 ? "text-orange-500" : "text-muted-foreground"}`}>{editBio.length}/500</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-border flex justify-end gap-4">
                <Button variant="ghost" className="h-14 px-8 font-bold text-muted-foreground rounded-2xl">ANNULER</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="h-14 px-12 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isSaving ? "SAUVEGARDE EN COURS..." : "METTRE À JOUR"}
                </Button>
              </div>
            </Card>

            {/* Social Links Card */}
            <Card className="glass-card p-10 rounded-[40px] border-border space-y-8">
              <h3 className="text-xl font-black tracking-tight">Connexions Sociales</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SocialInput icon={<Github className="w-4 h-4" />} label="GitHub" placeholder="github.com/votre_pseudo" />
                <SocialInput icon={<Twitter className="w-4 h-4" />} label="Twitter / X" placeholder="@votre_pseudo" />
                <SocialInput icon={<LinkIcon className="w-4 h-4" />} label="Portfolio" placeholder="https://votre-site.com" />
              </div>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

function BadgeItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 group cursor-help" title={label}>
      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center border border-border group-hover:scale-110 group-hover:border-primary/50 transition-all shadow-sm">
        {icon}
      </div>
    </div>
  );
}

function SocialInput({ icon, label, placeholder }: { icon: React.ReactNode, label: string, placeholder: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
        {icon} {label}
      </div>
      <Input placeholder={placeholder} className="bg-secondary/30 border-border h-11 text-xs" />
    </div>
  );
}
