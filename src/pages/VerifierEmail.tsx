import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { apiErrorMessage } from "@/lib/apiClient";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

type Status = "verifying" | "success" | "error";

const VerifierEmail = () => {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien de confirmation invalide : aucun token fourni.");
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(apiErrorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="glass-card rounded-xl border-glow p-8 text-center space-y-4">
            {status === "verifying" && (
              <>
                <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
                <h1 className="text-2xl font-black text-foreground">Confirmation en cours...</h1>
                <p className="text-sm text-muted-foreground font-mono">Merci de patienter quelques secondes.</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
                <h1 className="text-2xl font-black text-foreground">Email confirmé !</h1>
                <p className="text-sm text-muted-foreground font-mono">Votre compte est actif. Vous pouvez maintenant vous connecter.</p>
                <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow mt-2">
                  <Link to="/connexion">Se connecter</Link>
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-10 h-10 text-destructive mx-auto" />
                <h1 className="text-2xl font-black text-foreground">Lien invalide ou expiré</h1>
                <p className="text-sm text-muted-foreground font-mono">{errorMessage}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center pt-1">
                  <Mail className="w-3 h-3" />
                  <span>Connectez-vous pour renvoyer un lien de confirmation</span>
                </div>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link to="/connexion">Aller à la connexion</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerifierEmail;
