import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Building2, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";

const ENTERPRISE_REGISTERED_KEY = "bugbounty_has_registered_enterprise";

const SoumettreProgramme = () => {
  const { user, isAuthenticated } = useAuth();
  const { addProgramme } = useData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    organisation: "",
    contactName: "",
    contactEmail: "",
    programmeName: "",
    description: "",
    scopeRaw: "",
    minReward: "50000",
    maxReward: "1000000",
    rules: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      const hasRegisteredEnterprise = localStorage.getItem(ENTERPRISE_REGISTERED_KEY) === "true";
      const targetPath = hasRegisteredEnterprise
        ? "/connexion?role=entreprise&redirect=/soumettre-programme"
        : "/inscription?role=entreprise&redirect=/soumettre-programme";
      navigate(targetPath, { replace: true });
      return;
    }

    if (user?.role !== "entreprise") {
      toast.error("Cette action est réservée aux comptes entreprise");
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = () => {
    if (!isAuthenticated || user?.role !== "entreprise") {
      return;
    }

    const requiredFields = [form.organisation, form.contactName, form.contactEmail, form.programmeName, form.description, form.scopeRaw];
    if (requiredFields.some((field) => !field.trim())) {
      toast.error("Remplissez les champs obligatoires");
      return;
    }

    const minReward = Number(form.minReward);
    const maxReward = Number(form.maxReward);

    if (!Number.isFinite(minReward) || !Number.isFinite(maxReward) || minReward <= 0 || maxReward <= 0 || minReward > maxReward) {
      toast.error("Montants de récompense invalides");
      return;
    }

    const scope = form.scopeRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (scope.length === 0) {
      toast.error("Ajoutez au moins un élément de scope");
      return;
    }

    addProgramme({
      name: form.programmeName,
      entrepriseId: user.id,
      entrepriseName: form.organisation,
      description: `${form.description}\n\nRègles: ${form.rules || "Aucune règle supplémentaire"}`,
      scope,
      minReward,
      maxReward,
      status: "actif",
    });
    toast.success("Programme soumis et publié");
    navigate("/entreprise/programmes");
  };

  if (!isAuthenticated || user?.role !== "entreprise") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-16 flex items-center justify-center">
          <p className="text-sm text-muted-foreground font-mono">Redirection en cours...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="container px-4 relative z-10 max-w-4xl">
          <div className="text-center mb-10">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Entreprise</span>
            <h1 className="text-4xl md:text-5xl font-black mt-3 mb-4">
              Soumettre un <span className="text-gradient-cyber">Programme</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ouvrez votre scope aux hackers éthiques. Le programme sera visible après validation.
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Organisation *</label>
                <Input
                  value={form.organisation}
                  onChange={(e) => setForm((prev) => ({ ...prev, organisation: e.target.value }))}
                  placeholder="Nom de l'organisation"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Nom du programme *</label>
                <Input
                  value={form.programmeName}
                  onChange={(e) => setForm((prev) => ({ ...prev, programmeName: e.target.value }))}
                  placeholder="Programme API v1"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Contact sécurité *</label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Nom du responsable"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Email contact *</label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="security@organisation.com"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Description du programme *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Objectifs, surfaces d'attaque, exclusions..."
                className="bg-secondary border-border min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Scope (séparé par virgules) *</label>
              <Input
                value={form.scopeRaw}
                onChange={(e) => setForm((prev) => ({ ...prev, scopeRaw: e.target.value }))}
                placeholder="api.exemple.com, app.exemple.com, *.service.exemple.com"
                className="bg-secondary border-border"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Récompense min (FCFA) *</label>
                <Input
                  type="number"
                  min={1000}
                  value={form.minReward}
                  onChange={(e) => setForm((prev) => ({ ...prev, minReward: e.target.value }))}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Récompense max (FCFA) *</label>
                <Input
                  type="number"
                  min={1000}
                  value={form.maxReward}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxReward: e.target.value }))}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Règles spécifiques (optionnel)</label>
              <Textarea
                value={form.rules}
                onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value }))}
                placeholder="Périodes de test, exclusions, contraintes légales..."
                className="bg-secondary border-border min-h-[90px]"
              />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-mono flex items-start gap-2">
              <ListChecks className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Seules les entreprises inscrites et connectées peuvent publier un programme.
              </p>
            </div>

            <Button onClick={handleSubmit} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Building2 className="w-4 h-4 mr-2" />
              Soumettre le programme
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default SoumettreProgramme;
