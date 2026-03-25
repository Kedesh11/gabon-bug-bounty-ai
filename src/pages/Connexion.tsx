import Navbar from "@/components/Navbar";
import { Shield, Terminal, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin",
  hacker: "/hacker",
  entreprise: "/entreprise",
};

const Connexion = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const requiredRole: UserRole | null =
    roleParam === "admin" || roleParam === "hacker" || roleParam === "entreprise" ? roleParam : null;
  const redirectPath = searchParams.get("redirect");

  const handleSubmit = () => {
    if (!email || !password) {
      toast.error("Remplissez tous les champs");
      return;
    }

    const loggedUser = login(email, password);
    if (!loggedUser) {
      toast.error("Identifiants invalides");
      return;
    }

    if (requiredRole && loggedUser.role !== requiredRole) {
      toast.error(`Connectez-vous avec un compte ${requiredRole}`);
      return;
    }

    toast.success("Connexion réussie");
    if (redirectPath) {
      navigate(redirectPath);
      return;
    }
    navigate(ROLE_REDIRECTS[loggedUser.role]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8">
            <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-black text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {requiredRole === "entreprise" ? "Connexion entreprise requise" : "Accédez à votre espace sécurisé"}
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 space-y-5">
            <div className="bg-secondary rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> Comptes démo
              </p>
              <button
                onClick={() => {
                  setEmail("admin@bugbounty.com");
                  setPassword("demo");
                }}
                className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                admin@bugbounty.com → Admin
              </button>
              <button
                onClick={() => {
                  setEmail("hacker@bugbounty.com");
                  setPassword("demo");
                }}
                className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                hacker@bugbounty.com → Hacker
              </button>
              <button
                onClick={() => {
                  setEmail("entreprise@bugbounty.com");
                  setPassword("demo");
                }}
                className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                entreprise@bugbounty.com → Entreprise
              </button>
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Mot de passe</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              Se connecter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Link to="/mot-de-passe-oublie" className="block text-center text-xs text-primary hover:underline font-mono">
              <span className="inline-flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                Mot de passe oublié ?
              </span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center">
              <Terminal className="w-3 h-3" />
              <span>Connexion sécurisée · Chiffrement E2E</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link
              to={requiredRole === "entreprise" ? `/inscription?role=entreprise${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}` : "/inscription"}
              className="text-primary hover:underline font-semibold"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Connexion;
