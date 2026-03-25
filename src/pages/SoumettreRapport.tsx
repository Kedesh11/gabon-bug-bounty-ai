import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FileText, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Report } from "@/stores/dataStore";

const SoumettreRapport = () => {
  const { programmes, addReport } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    programmeId: "",
    vulnerability: "",
    severity: "moyenne" as Report["severity"],
    impactedAsset: "",
    description: "",
    steps: "",
    businessImpact: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [acceptAnalysis, setAcceptAnalysis] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeProgrammes = programmes.filter((programme) => programme.status === "actif");

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPdfFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Le rapport doit être au format PDF");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10MB)");
      event.target.value = "";
      return;
    }
    setPdfFile(file);
  };

  const handleSubmit = () => {
    const requiredValues = [
      form.title,
      form.programmeId,
      form.vulnerability,
      form.impactedAsset,
      form.description,
      form.steps,
    ];
    if (requiredValues.some((value) => !value.trim())) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    if (!pdfFile) {
      toast.error("Ajoutez le rapport PDF");
      return;
    }
    if (!acceptAnalysis) {
      toast.error("Vous devez autoriser l'analyse IA et entreprise");
      return;
    }

    const selectedProgramme = programmes.find((programme) => programme.id === form.programmeId);
    if (!selectedProgramme) {
      toast.error("Programme invalide");
      return;
    }

    setSubmitting(true);
    addReport({
      title: form.title,
      description: `${form.description}\n\nImpact business: ${form.businessImpact || "Non précisé"}`,
      severity: form.severity,
      hackerId: user?.id || "",
      hackerName: user?.name || "",
      programmeId: selectedProgramme.id,
      programmeName: selectedProgramme.name,
      entrepriseId: selectedProgramme.entrepriseId,
      vulnerability: form.vulnerability,
      proof: `Actif touché: ${form.impactedAsset}\nÉtapes: ${form.steps}\nPièce jointe PDF: ${pdfFile.name}`,
      pdfFileName: pdfFile.name,
      analysisStatus: "en_attente",
    });

    toast.success("Rapport soumis. Analyse IA en file d'attente.");
    setSubmitting(false);
    navigate("/hacker/rapports");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="container px-4 relative z-10 max-w-4xl">
          <div className="text-center mb-10">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Hacker Space</span>
            <h1 className="text-4xl md:text-5xl font-black mt-3 mb-4">
              Soumettre un <span className="text-gradient-cyber">Rapport</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Importez un rapport PDF détaillé. Le rapport est analysé par les agents IA puis transmis à l'entreprise.
            </p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Titre *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: SQL Injection sur endpoint /search"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Programme cible *</label>
                <select
                  value={form.programmeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, programmeId: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Sélectionner un programme</option>
                  {activeProgrammes.map((programme) => (
                    <option key={programme.id} value={programme.id}>
                      {programme.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Type de vulnérabilité *</label>
                <Input
                  value={form.vulnerability}
                  onChange={(e) => setForm((prev) => ({ ...prev, vulnerability: e.target.value }))}
                  placeholder="XSS, SQLi, IDOR..."
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Sévérité *</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as Report["severity"] }))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <option value="info">Info</option>
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Actif impacté *</label>
              <Input
                value={form.impactedAsset}
                onChange={(e) => setForm((prev) => ({ ...prev, impactedAsset: e.target.value }))}
                placeholder="api.exemple.com/v1/search"
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Description technique *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Contexte, vecteur d'attaque, preuves techniques..."
                className="bg-secondary border-border min-h-[110px]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Étapes de reproduction *</label>
              <Textarea
                value={form.steps}
                onChange={(e) => setForm((prev) => ({ ...prev, steps: e.target.value }))}
                placeholder="1) ... 2) ... 3) ..."
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Impact business (optionnel)</label>
              <Textarea
                value={form.businessImpact}
                onChange={(e) => setForm((prev) => ({ ...prev, businessImpact: e.target.value }))}
                placeholder="Exposition des données, impact conformité, risque financier..."
                className="bg-secondary border-border min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Rapport PDF *</label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="bg-secondary border-border file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
              />
              {pdfFile && (
                <p className="mt-2 text-xs font-mono text-primary flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {pdfFile.name}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptAnalysis}
                onChange={(e) => setAcceptAnalysis(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground font-mono leading-relaxed">
                J'autorise l'analyse automatique du PDF par les agents IA et son partage avec l'entreprise propriétaire du programme.
              </span>
            </label>

            <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent font-mono flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                La soumission enclenche un triage automatique puis une revue entreprise. Le statut passe en `en_analyse`.
              </p>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Soumission..." : "Soumettre le rapport"}
            </Button>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default SoumettreRapport;
