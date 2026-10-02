import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfig, useUpdateConfig, DEFAULT_SYSTEM_CONFIG } from "@/hooks/api/config";
import { apiErrorMessage } from "@/lib/apiClient";

export function useSecuritySettings() {
  const { data: config = DEFAULT_SYSTEM_CONFIG } = useConfig();
  const updateConfig = useUpdateConfig();

  const [securitySettings, setSecuritySettings] = useState({
    require2FA: config.require2FA,
    passwordComplexity: config.passwordComplexity,
  });

  useEffect(() => {
    setSecuritySettings({
      require2FA: config.require2FA,
      passwordComplexity: config.passwordComplexity,
    });
  }, [config]);

  const handleSaveSecurity = () => {
    updateConfig.mutate(securitySettings, {
      onSuccess: () => toast.success("Politiques de sécurité mises à jour"),
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return { securitySettings, setSecuritySettings, handleSaveSecurity };
}
