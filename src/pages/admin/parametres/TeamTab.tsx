import { Mail, Shield, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEAM_MEMBERS } from "./useTeamMembers";
import type { useTeamMembers } from "./useTeamMembers";
import { useContent } from "@/hooks/api/content";

type TeamMembersState = ReturnType<typeof useTeamMembers>;

export function TeamTab({
  isAddMemberOpen,
  setIsAddMemberOpen,
  newMemberName,
  setNewMemberName,
  newMemberEmail,
  setNewMemberEmail,
  newMemberRole,
  setNewMemberRole,
  handleAddMember,
}: TeamMembersState) {
  const heading = useContent("admin.parametres.team.heading", "Administrateurs du Système");
  const inviteDialogTitle = useContent("admin.parametres.team.invite-dialog.title", "Nouveau Membre");
  const inviteDialogDescription = useContent("admin.parametres.team.invite-dialog.description", "Invitez un nouvel administrateur à rejoindre l'équipe de gestion.");
  const invite2faHelp = useContent(
    "admin.parametres.team.invite-2fa-help",
    "Le nouveau membre recevra une invitation par email pour configurer son mot de passe et son authentification 2FA.",
  );
  return (
    <TabsContent value="team" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
          <h3 className="text-lg font-black tracking-tight">{heading}</h3>
          <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-bold h-10 px-6 gap-2">
                <UserPlus className="w-4 h-4" /> AJOUTER UN MEMBRE
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] glass-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-primary" /> {inviteDialogTitle}
                </DialogTitle>
                <DialogDescription className="font-medium">
                  {inviteDialogDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nom Complet</Label>
                  <Input
                    placeholder="Ex: Jean Dupont"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="h-12 bg-secondary/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Adresse Email Professionnelle</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="jean.dupont@cyber.ga"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="pl-10 h-12 bg-secondary/50 border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rôle & Permissions</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="h-12 bg-secondary/50 border-border font-bold">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-border">
                      <SelectItem value="superadmin" className="font-bold">Super Administrateur</SelectItem>
                      <SelectItem value="triage" className="font-bold">Triage Lead</SelectItem>
                      <SelectItem value="finance" className="font-bold">Gestionnaire Finances</SelectItem>
                      <SelectItem value="support" className="font-bold">Support Technique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {invite2faHelp}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddMemberOpen(false)} className="font-bold h-12">ANNULER</Button>
                <Button onClick={handleAddMember} className="bg-primary text-primary-foreground font-bold gap-2 px-8 h-12">
                  ENVOYER L'INVITATION
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="divide-y divide-border">
          {TEAM_MEMBERS.map((member, i) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-secondary/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {member.name[0]}
                </div>
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <Badge variant="outline" className="font-black text-[10px] uppercase">{member.role}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Actif: {member.lastActive}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TabsContent>
  );
}
