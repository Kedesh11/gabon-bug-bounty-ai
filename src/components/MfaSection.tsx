import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { useMfaStatus, useEnrollMfa, useUnenrollMfa, MfaEnrollment } from "@/hooks/api/mfa";
import { apiErrorMessage } from "@/lib/apiClient";

// Self-contained: no props needed, safe to drop into any role's paramètres page
// (hacker/entreprise/admin) — each renders its own copy, all talking to the same
// account-scoped /api/auth/mfa/* endpoints.
export function MfaSection() {
  const { confirmMfaEnrollment } = useAuth();
  const { data: status, isLoading } = useMfaStatus();
  const enroll = useEnrollMfa();
  const unenroll = useUnenrollMfa();
  const queryClient = useQueryClient();

  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleEnroll = async () => {
    try {
      const data = await enroll.mutateAsync();
      setEnrollment(data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!enrollment || code.length !== 6) {
      toast.error("Saisissez le code à 6 chiffres");
      return;
    }
    setIsConfirming(true);
    try {
      await confirmMfaEnrollment(enrollment.factorId, code);
      toast.success("2FA activé avec succès");
      setEnrollment(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["mfa-status"] });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setEnrollment(null);
    setCode("");
  };

  const handleUnenroll = async () => {
    if (!status?.factorId) return;
    try {
      await unenroll.mutateAsync(status.factorId);
      toast.success("2FA désactivé");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (isLoading) return null;

  return (
    <div className="glass-card rounded-xl p-5 border-glow space-y-4">
      <div className="flex items-center gap-2">
        {status?.enrolled ? (
          <ShieldCheck className="w-5 h-5 text-green-500" />
        ) : (
          <Shield className="w-5 h-5 text-muted-foreground" />
        )}
        <h3 className="text-sm font-semibold text-foreground">Authentification à deux facteurs (2FA)</h3>
      </div>

      {status?.enrolled && !enrollment && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Le 2FA est activé — une application d'authentification (Google Authenticator, Authy...) vous demandera un code à chaque connexion.
          </p>
          <Button size="sm" variant="outline" className="text-destructive" onClick={handleUnenroll} disabled={unenroll.isPending}>
            <ShieldOff className="w-4 h-4 mr-2" /> Désactiver le 2FA
          </Button>
        </div>
      )}

      {!status?.enrolled && !enrollment && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Protégez votre compte avec un code à usage unique généré par une application d'authentification.
          </p>
          <Button size="sm" onClick={handleEnroll} disabled={enroll.isPending}>
            {enroll.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Activer le 2FA
          </Button>
        </div>
      )}

      {enrollment && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Scannez ce QR code avec votre application d'authentification, ou saisissez la clé manuellement.
          </p>
          <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
            <img src={enrollment.qrCode} alt="QR code d'activation du 2FA" className="w-40 h-40" />
          </div>
          <p className="text-[10px] font-mono text-center text-muted-foreground break-all">{enrollment.secret}</p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-mono block">Code à 6 chiffres</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              className="text-center text-xl tracking-[0.5em] font-mono bg-secondary border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} disabled={isConfirming} className="flex-1">
              {isConfirming ? "Vérification..." : "Confirmer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
