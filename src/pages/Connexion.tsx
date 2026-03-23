import Navbar from "@/components/Navbar";
import { Shield, Terminal, ArrowRight, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Connexion = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"hacker" | "organisation">("hacker");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md px-4">
          {/* Logo */}
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
            {/* Role selector (register only) */}
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
                  onClick={() => setRole("organisation")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    role === "organisation"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Organisation</span>
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
                  placeholder={role === "hacker" ? "CyberPanther_GA" : "Ministère de ..."}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="vous@exemple.ga"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Mot de passe</label>
              <Input
                type="password"
                placeholder="••••••••••"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="text-sm text-muted-foreground font-mono mb-1.5 block">Confirmer le mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••••"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Terminal hint */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center">
              <Terminal className="w-3 h-3" />
              <span>Connexion sécurisée · Chiffrement E2E</span>
            </div>
          </div>

          {/* Toggle mode */}
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
