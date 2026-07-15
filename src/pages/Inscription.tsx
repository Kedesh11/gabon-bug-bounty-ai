import Navbar from "@/components/Navbar";
import { Building2, ArrowRight, Shield, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { UserRole } from "@/types/auth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/apiClient";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin",
  hacker: "/hacker",
  entreprise: "/entreprise",
  triage: "/admin/triage",
  finance: "/admin/finance",
  support: "/admin/support",
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    const effectiveRole = isEntrepriseFlow ? "entreprise" : role;

    try {
      const createdUser = await register(name, email, password, effectiveRole);

      toast.success("Bienvenue dans l'aventure !");
      if (redirectPath && createdUser.role === "entreprise") {
        navigate(redirectPath);
        return;
      }
      navigate(ROLE_REDIRECTS[createdUser.role]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl px-4">
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-2xl mb-4 group hover:border-primary/50 transition-all">
              <ShieldCheck className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Rejoignez le Réseau</h1>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              Contribuez à la sécurité numérique du Gabon.
            </p>
          </div>

          <div className="glass-card rounded-2xl border-glow p-8 shadow-2xl space-y-8">
            {!isEntrepriseFlow && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole("hacker")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                    role === "hacker"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-lg"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${role === "hacker" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Hacker</p>
                    <p className="text-[10px] opacity-70">Trouver des bugs</p>
                  </div>
                </button>
                <button
                  onClick={() => setRole("entreprise")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                    role === "entreprise"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-lg"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${role === "entreprise" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Entreprise</p>
                    <p className="text-[10px] opacity-70">Gérer la sécurité</p>
                  </div>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  {role === "hacker" ? "Nom de Code / Pseudo" : "Nom de l'Organisation"}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "hacker" ? "CyberPanther_241" : "Ministère du Numérique"}
                  className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Professionnel</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@organisation.ga"
                  className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Mot de passe</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirmation</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="h-12 bg-secondary/50 border-border focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground font-black text-lg hover:bg-primary/90 transition-all shadow-xl active:scale-[0.98]">
                  CRÉER MON COMPTE <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </form>
          </div>

          <div className="text-center mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Déjà membre ?{" "}
              <Link to="/connexion" className="text-primary font-black hover:underline underline-offset-4">SE CONNECTER</Link>
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
              <Shield className="w-3 h-3" /> Conforme aux directives de sécurité numérique
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inscription;
