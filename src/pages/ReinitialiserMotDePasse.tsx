import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

const ReinitialiserMotDePasse = () => {
  const title = useContent("reinitialiser-mot-de-passe.title", "Réinitialiser le mot de passe");
  const subtitle = useContent("reinitialiser-mot-de-passe.subtitle", "Définissez un nouveau mot de passe sécurisé");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    if (!token || !password || !confirmPassword) {
      toast.error("Remplissez tous les champs");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    toast.success("Mot de passe réinitialisé");
    navigate("/connexion");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-black text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {subtitle}
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 space-y-5">
            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Token de sécurité</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="token_de_reinitialisation"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Nouveau mot de passe</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Confirmer le mot de passe</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              Enregistrer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center">
              <KeyRound className="w-3 h-3" />
              <span>Le token est vérifié côté serveur en production</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Retour à{" "}
            <Link to="/connexion" className="text-primary hover:underline font-semibold">
              la connexion
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default ReinitialiserMotDePasse;
