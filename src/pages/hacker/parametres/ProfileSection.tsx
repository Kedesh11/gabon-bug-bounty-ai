import type { ChangeEvent } from "react";
import { Save, UserCircle2, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/api/content";

interface ProfileSectionProps {
  profileName: string;
  setProfileName: (value: string) => void;
  profileEmail: string;
  setProfileEmail: (value: string) => void;
  profileAvatar: string | undefined;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export function ProfileSection({
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  profileAvatar,
  onAvatarChange,
  onSave,
}: ProfileSectionProps) {
  const heading = useContent("hacker.parametres.profile.heading", "Informations d'inscription");
  return (
    <div className="glass-card rounded-xl p-5 border-glow space-y-4">
      <div className="flex items-center gap-3">
        <UserCircle2 className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
      </div>
      <div className="flex items-center gap-4">
        {profileAvatar ? (
          <img src={profileAvatar} alt="Photo de profil" className="w-16 h-16 rounded-full object-cover border border-border" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center">
            <UserCircle2 className="w-9 h-9 text-muted-foreground" />
          </div>
        )}
        <div>
          <label className="inline-flex items-center gap-2 text-xs font-mono text-primary cursor-pointer">
            <ImagePlus className="w-3 h-3" />
            Ajouter / changer la photo
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          </label>
          <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, WebP · max 2MB</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-mono text-muted-foreground">Nom complet / pseudo</Label>
          <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-1 bg-secondary border-border" />
        </div>
        <div>
          <Label className="text-xs font-mono text-muted-foreground">Email</Label>
          <Input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="mt-1 bg-secondary border-border" />
        </div>
      </div>
      <Button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Save className="w-4 h-4 mr-2" />
        Mettre à jour mon inscription
      </Button>
    </div>
  );
}
