import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfig, useUpdateConfig, DEFAULT_SYSTEM_CONFIG } from "@/hooks/api/config";
import { apiErrorMessage } from "@/lib/apiClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useGeneralSettings() {
  const { data: config = DEFAULT_SYSTEM_CONFIG } = useConfig();
  const updateConfig = useUpdateConfig();

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
    updateConfig.mutate(generalSettings, {
      onSuccess: () => toast.success("Paramètres généraux sauvegardés"),
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return { generalSettings, setGeneralSettings, handleSaveGeneral };
}
