import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfig, useUpdateConfig, DEFAULT_SYSTEM_CONFIG } from "@/hooks/api/config";
import { apiErrorMessage } from "@/lib/apiClient";

export function useSecuritySettings() {
  const { data: config = DEFAULT_SYSTEM_CONFIG } = useConfig();
  const updateConfig = useUpdateConfig();

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
    updateConfig.mutate(securitySettings, {
      onSuccess: () => toast.success("Politiques de sécurité mises à jour"),
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return { securitySettings, setSecuritySettings, handleSaveSecurity };
}
