import Navbar from "@/components/Navbar";
import { Shield, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { resolveDashboardPath } from "@/lib/roleNav";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/apiClient";

const Connexion = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requiredRole = searchParams.get("role");
  const redirectPath = searchParams.get("redirect");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      const loggedUser = await login(email, password);

      if (requiredRole && loggedUser.role !== requiredRole) {
        toast.error(`Accès refusé. Veuillez vous connecter avec un compte ${requiredRole}.`);
        return;
      }

      toast.success(`Bienvenue, ${loggedUser.name} !`);
      navigate(redirectPath || resolveDashboardPath(loggedUser));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="relative z-10 w-full max-w-2xl px-4">
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-2xl mb-4 group hover:border-primary/50 transition-all">
              <Shield className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Accès Sécurisé</h1>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              {requiredRole ? `Veuillez vous connecter à votre compte ${requiredRole} pour continuer.` : "Gérez vos vulnérabilités et vos programmes avec l'IA."}
            </p>
          </div>

          <div className="glass-card rounded-2xl border-glow p-8 shadow-2xl space-y-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Adresse Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.ga"
                    className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mot de passe</label>
                    <Link to="/mot-de-passe-oublie" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">Oublié ?</Link>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground font-black text-lg hover:bg-primary/90 transition-all active:scale-[0.98]">
                SE CONNECTER <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/inscription" className="text-primary font-black hover:underline underline-offset-4">CRÉER UN COMPTE</Link>
            </p>
            <div className="flex items-center justify-center gap-6 opacity-40">
              <ShieldCheck className="w-5 h-5" />
              <span className="h-4 w-px bg-border" />
              <p className="text-[10px] font-bold uppercase tracking-tighter">Infrastructure sécurisée par AI-Shield™</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Connexion;
