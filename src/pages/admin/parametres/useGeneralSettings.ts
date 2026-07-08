import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useGeneralSettings() {
  const { config, updateConfig } = useData();

  const [generalSettings, setGeneralSettings] = useState({
    platformName: config.platformName,
    contactEmail: config.contactEmail,
    supportUrl: config.supportUrl,
    autoTriage: config.autoTriage,
    enterpriseValidation: config.enterpriseValidation,
    triageLimitHours: config.triageLimitHours,
  });

  useEffect(() => {
    setGeneralSettings({
      platformName: config.platformName,
      contactEmail: config.contactEmail,
      supportUrl: config.supportUrl,
      autoTriage: config.autoTriage,
      enterpriseValidation: config.enterpriseValidation,
      triageLimitHours: config.triageLimitHours,
    });
  }, [config]);

  const handleSaveGeneral = () => {
    if (!generalSettings.platformName.trim()) {
      toast.error("Le nom de la plateforme est requis");
      return;
    }
    if (!emailRegex.test(generalSettings.contactEmail.trim())) {
      toast.error("Format d'email de contact invalide");
      return;
    }
    updateConfig(generalSettings);
    toast.success("Paramètres généraux sauvegardés");
  };

  return { generalSettings, setGeneralSettings, handleSaveGeneral };
}
