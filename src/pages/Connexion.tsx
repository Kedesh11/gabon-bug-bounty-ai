import Navbar from "@/components/Navbar";
import { 
  Shield, 
  Terminal, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  ShieldAlert, 
  Zap, 
  Calculator, 
  LifeBuoy, 
  Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { UserRole } from "@/types/auth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin",
  hacker: "/hacker",
  entreprise: "/entreprise",
  triage: "/admin/triage",
  finance: "/admin/finance",
  support: "/admin/support",
};

const Connexion = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const requiredRole: UserRole | null =
    roleParam === "admin" || roleParam === "hacker" || roleParam === "entreprise" || 
    roleParam === "triage" || roleParam === "finance" || roleParam === "support" ? roleParam as UserRole : null;
  const redirectPath = searchParams.get("redirect");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const loggedUser = login(email, password);
    if (!loggedUser) {
      toast.error("Identifiants invalides ou compte inexistant");
      return;
    }

    if (requiredRole && loggedUser.role !== requiredRole) {
      toast.error(`Accès refusé. Veuillez vous connecter avec un compte ${requiredRole}.`);
      return;
    }

    toast.success(`Bienvenue, ${loggedUser.name} !`);
    if (redirectPath) {
      navigate(redirectPath);
      return;
    }
    navigate(ROLE_REDIRECTS[loggedUser.role]);
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("demo");
    setTimeout(() => {
      const loggedUser = login(userEmail, "demo");
      if (loggedUser) {
        toast.success(`Connexion démo : ${loggedUser.name}`);
        navigate(redirectPath || ROLE_REDIRECTS[loggedUser.role]);
      }
    }, 300);
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
                  <Input
                    type="password"
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-background px-4 text-muted-foreground tracking-widest">Accès Rapide (Mode Démo)</span></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <QuickLoginBtn icon={<ShieldAlert className="w-4 h-4 text-primary" />} label="Admin" sub="Principal" onClick={() => quickLogin("admin@bugbounty.com")} />
              <QuickLoginBtn icon={<Terminal className="w-4 h-4 text-accent" />} label="Hacker" sub="CyberPanther" onClick={() => quickLogin("hacker@bugbounty.com")} />
              <QuickLoginBtn icon={<Building2 className="w-4 h-4 text-blue-500" />} label="Entreprise" sub="Ministère" onClick={() => quickLogin("entreprise@bugbounty.com")} />
              <QuickLoginBtn icon={<Search className="w-4 h-4 text-orange-500" />} label="Triage" sub="Sarah" onClick={() => quickLogin("triage@bugbounty.com")} />
              <QuickLoginBtn icon={<Calculator className="w-4 h-4 text-green-500" />} label="Finance" sub="Marc" onClick={() => quickLogin("finance@bugbounty.com")} />
              <QuickLoginBtn icon={<LifeBuoy className="w-4 h-4 text-blue-400" />} label="Support" sub="Paul" onClick={() => quickLogin("support@bugbounty.com")} />
            </div>
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

function QuickLoginBtn({ icon, label, sub, onClick }: { icon: React.ReactNode, label: string, sub: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left">
      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-foreground truncate">{label}</p>
        <p className="text-[9px] text-muted-foreground truncate font-mono">{sub}</p>
      </div>
    </button>
  );
}

export default Connexion;
