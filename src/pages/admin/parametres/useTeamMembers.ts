import { useState } from "react";
import { toast } from "sonner";
import { notifyStaffInvitation } from "@/lib/inviteLink";
import { apiErrorMessage } from "@/lib/apiClient";
import { useStaffAccounts, useAddStaffAccountToRole, useDeleteStaffAccount, useRoles } from "@/hooks/api/roles";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useTeamMembers() {
  const { data: accounts = [] } = useStaffAccounts();
  const { data: roles = [] } = useRoles();
  const addAccount = useAddStaffAccountToRole();
  const deleteAccount = useDeleteStaffAccount();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRoleId, setNewMemberRoleId] = useState("");

  const resetForm = () => {
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberRoleId("");
  };

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
    if (!newMemberRoleId) {
      toast.error("Sélectionnez un rôle");
      return;
    }

    addAccount.mutate(
      { roleId: newMemberRoleId, name: newMemberName.trim(), email: newMemberEmail.trim() },
      {
        onSuccess: (result) => {
          notifyStaffInvitation(newMemberName, result, "ajouté à l'équipe");
          setIsAddMemberOpen(false);
          resetForm();
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const handleDeleteMember = (id: string) => {
    deleteAccount.mutate(id, {
      onSuccess: () => toast.success("Compte supprimé"),
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return {
    accounts,
    roles,
    isAddMemberOpen,
    setIsAddMemberOpen,
    newMemberName,
    setNewMemberName,
    newMemberEmail,
    setNewMemberEmail,
    newMemberRoleId,
    setNewMemberRoleId,
    handleAddMember,
    handleDeleteMember,
    isAdding: addAccount.isPending,
  };
}
