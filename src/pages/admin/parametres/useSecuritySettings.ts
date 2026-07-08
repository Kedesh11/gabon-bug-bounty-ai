import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/contexts/DataContext";

export function useSecuritySettings() {
  const { config, updateConfig, resetPlatform } = useData();

  const [securitySettings, setSecuritySettings] = useState({
    require2FA: config.require2FA,
    ipWhitelisting: config.ipWhitelisting,
    sessionTimeout: config.sessionTimeout,
    passwordComplexity: config.passwordComplexity,
  });

  useEffect(() => {
    setSecuritySettings({
      require2FA: config.require2FA,
      ipWhitelisting: config.ipWhitelisting,
      sessionTimeout: config.sessionTimeout,
      passwordComplexity: config.passwordComplexity,
    });
  }, [config]);

  const handleSaveSecurity = () => {
    if (securitySettings.sessionTimeout < 5 || securitySettings.sessionTimeout > 1440) {
      toast.error("Le délai de session doit être compris entre 5 et 1440 minutes");
      return;
    }
    updateConfig(securitySettings);
    toast.success("Politiques de sécurité mises à jour");
  };

  const handleResetPlatform = () => {
    toast.loading("Réinitialisation en cours...");
    setTimeout(() => {
      resetPlatform();
    }, 2000);
  };

  return { securitySettings, setSecuritySettings, handleSaveSecurity, handleResetPlatform };
}
