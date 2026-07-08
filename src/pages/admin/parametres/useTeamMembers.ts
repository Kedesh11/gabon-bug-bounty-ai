import { useState } from "react";
import { toast } from "sonner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TEAM_MEMBERS = [
  { name: "Admin Principal", email: "admin@bugbounty.ga", role: "Super Admin", lastActive: "Maintenant" },
  { name: "Sarah Koné", email: "s.kone@cyber.ga", role: "Triage Lead", lastActive: "Il y a 2h" },
  { name: "Marc Durand", email: "m.durand@it.ga", role: "Finances", lastActive: "Il y a 1j" },
];

export function useTeamMembers() {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("triage");

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (newMemberName.trim().length < 2) {
      toast.error("Le nom est trop court");
      return;
    }
    if (!emailRegex.test(newMemberEmail.trim())) {
      toast.error("Format d'email invalide");
      return;
    }
    toast.success(`${newMemberName} a été ajouté à l'équipe en tant que ${newMemberRole}`);
    setIsAddMemberOpen(false);
    setNewMemberName("");
    setNewMemberEmail("");
  };

  return {
    isAddMemberOpen,
    setIsAddMemberOpen,
    newMemberName,
    setNewMemberName,
    newMemberEmail,
    setNewMemberEmail,
    newMemberRole,
    setNewMemberRole,
    handleAddMember,
  };
}
