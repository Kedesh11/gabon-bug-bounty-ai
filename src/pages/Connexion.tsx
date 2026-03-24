import Navbar from "@/components/Navbar";
import { Shield, Terminal, ArrowRight, User, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin",
  hacker: "/hacker",
  entreprise: "/entreprise",
};

const Connexion = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"hacker" | "entreprise">("hacker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!email || !password) { toast.error("Remplissez tous les champs"); return; }

    if (mode === "login") {
      const success = login(email, password);
      if (success) {
        // Determine role from demo accounts
        const roleMap: Record<string, UserRole> = {
          "admin@bugbounty.ga": "admin",
          "hacker@bugbounty.ga": "hacker",
          "entreprise@bugbounty.ga": "entreprise",
        };
        const userRole = roleMap[email] || "hacker";
        toast.success("Connexion réussie !");
        navigate(ROLE_REDIRECTS[userRole]);
      }
    } else {
      if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
      if (!name) { toast.error("Le nom est obligatoire"); return; }
      const success = register(name, email, password, role);
      if (success) {
        toast.success("Inscription réussie !");
        navigate(ROLE_REDIRECTS[role]);
      }
    }
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
            <h1 className="text-3xl font-black text-foreground">
              {mode === "login" ? "Connexion" : "Inscription"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {mode === "login" ? "Accédez à votre espace sécurisé" : "Rejoignez la plateforme BugBounty.ga"}
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 space-y-5">
            {/* Demo accounts hint */}
            {mode === "login" && (
              <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Comptes démo
                </p>
                <button onClick={() => { setEmail("admin@bugbounty.ga"); setPassword("demo"); }}
                  className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                  admin@bugbounty.ga → Admin
                </button>
                <button onClick={() => { setEmail("hacker@bugbounty.ga"); setPassword("demo"); }}
                  className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                  hacker@bugbounty.ga → Hacker
                </button>
                <button onClick={() => { setEmail("entreprise@bugbounty.ga"); setPassword("demo"); }}
                  className="block text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                  entreprise@bugbounty.ga → Entreprise
                </button>
              </div>
            )}

            {mode === "register" && (
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
                  <span className="text-xs opacity-70">Chercheur de bugs</span>
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
                  <span className="text-xs opacity-70">Protégez vos systèmes</span>
                </button>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="text-sm text-muted-foreground font-mono mb-1.5 block">
                  {role === "hacker" ? "Pseudo" : "Nom de l'organisation"}
                </label>
                <Input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder={role === "hacker" ? "CyberPanther_GA" : "Ministère de ..."}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Email</label>
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.ga"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Mot de passe</label>
              <Input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Confirmer le mot de passe</label>
                <Input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center">
              <Terminal className="w-3 h-3" />
              <span>Connexion sécurisée · Chiffrement E2E</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button onClick={() => setMode("register")} className="text-primary hover:underline font-semibold">
                  S'inscrire
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <button onClick={() => setMode("login")} className="text-primary hover:underline font-semibold">
                  Se connecter
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Connexion;
