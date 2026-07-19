import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

const MotDePasseOublie = () => {
  const title = useContent("mot-de-passe-oublie.title", "Mot de passe oublié");
  const subtitle = useContent("mot-de-passe-oublie.subtitle", "Recevez un lien sécurisé de réinitialisation");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!email) {
      toast.error("Saisissez votre email");
      return;
    }
    setSent(true);
    toast.success("Lien de réinitialisation envoyé");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8">
            <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-black text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {subtitle}
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 space-y-5">
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

            <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cyber-glow">
              Envoyer le lien
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {sent && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
                <p className="text-xs text-primary font-mono leading-relaxed">
                  Email envoyé à {email}. Dans cette démo, vous pouvez continuer via{" "}
                  <Link to="/reinitialiser-mot-de-passe" className="underline">
                    le formulaire de réinitialisation
                  </Link>.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono justify-center">
              <Mail className="w-3 h-3" />
              <span>Vérifiez également vos spams</span>
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

export default MotDePasseOublie;
