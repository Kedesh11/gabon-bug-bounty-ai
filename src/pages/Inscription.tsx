import Navbar from "@/components/Navbar";
import { User, Building2, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin",
  hacker: "/hacker",
  entreprise: "/entreprise",
};

const Inscription = () => {
  const [searchParams] = useSearchParams();
  const forcedRole = searchParams.get("role");
  const isEntrepriseFlow = forcedRole === "entreprise";
  const redirectPath = searchParams.get("redirect");

  const [role, setRole] = useState<"hacker" | "entreprise">(isEntrepriseFlow ? "entreprise" : "hacker");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isEntrepriseFlow) {
      setRole("entreprise");
    }
  }, [isEntrepriseFlow]);

  const handleSubmit = () => {
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Remplissez tous les champs");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    const effectiveRole = isEntrepriseFlow ? "entreprise" : role;

    const createdUser = register(name, email, password, effectiveRole);
    if (!createdUser) {
      toast.error("Inscription impossible");
      return;
    }

    toast.success("Compte créé avec succès");
    if (redirectPath && createdUser.role === "entreprise") {
      navigate(redirectPath);
      return;
    }
    navigate(ROLE_REDIRECTS[createdUser.role]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />

        <div className="relative z-10 w-full max-w-lg px-4">
          <div className="text-center mb-8">
            <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-black text-foreground">Inscription</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {isEntrepriseFlow ? "Créez votre compte entreprise" : "Créez votre compte hacker ou entreprise"}
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 space-y-5">
            {!isEntrepriseFlow ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRole("hacker")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    role === "hacker"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-semibold">Hacker</span>
                  <span className="text-xs opacity-70">Recherche de vulnérabilités</span>
                </button>
                <button
                  onClick={() => setRole("entreprise")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    role === "entreprise"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Entreprise</span>
                  <span className="text-xs opacity-70">Gestion des programmes</span>
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-mono">
                Inscription entreprise requise pour soumettre un programme.
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">
                {role === "hacker" ? "Pseudo" : "Nom de l'organisation"}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "hacker" ? "CyberPanther_GA" : "Ministère de ..."}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
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

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Confirmer le mot de passe</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              Créer mon compte
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà inscrit ?{" "}
            <Link
              to={isEntrepriseFlow ? `/connexion?role=entreprise${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}` : "/connexion"}
              className="text-primary hover:underline font-semibold"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Inscription;
