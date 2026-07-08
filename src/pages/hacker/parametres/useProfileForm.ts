import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { useData } from "@/contexts/DataContext";
import { addNotification } from "@/lib/notifications";
import { emailRegex, nameRegex, normalizeSpaces } from "@/lib/paymentValidation";

export function useProfileForm() {
  const { user, updateProfile } = useAuth();
  const { hackers, updateHacker } = useData();

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(user?.avatar);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileAvatar(user.avatar);
  }, [user]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfileAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!user) return;
    const normalizedName = normalizeSpaces(profileName);
    const normalizedEmail = profileEmail.trim().toLowerCase();

    if (!nameRegex.test(normalizedName)) {
      toast.error("Nom invalide");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Email invalide");
      return;
    }

    const updated = updateProfile({ name: normalizedName, email: normalizedEmail, avatar: profileAvatar });
    if (!updated) {
      toast.error("Impossible de mettre à jour le profil (email déjà utilisé)");
      return;
    }

    const hacker = hackers.find((entry) => entry.id === user.id);
    if (hacker) {
      updateHacker(user.id, { name: updated.name, email: updated.email });
    }

    addNotification(user.id, {
      title: "Profil mis à jour",
      message: "Vos informations d'inscription ont été mises à jour.",
      type: "success",
    });

    toast.success("Informations d'inscription mises à jour");
  };

  return {
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    profileAvatar,
    handleAvatarChange,
    saveProfile,
  };
}
