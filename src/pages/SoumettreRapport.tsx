import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { 
  FileText, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Zap, 
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  FileSearch,
  Image as ImageIcon,
  X,
  Code2,
  Hammer,
  Activity,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { Report } from "@/stores/dataStore";
import { Badge } from "@/components/ui/badge";

const VRT_CATEGORIES = [
  "Injection côté serveur (SQLi, NoSQL, Commande OS)",
  "Rupture d'authentification et gestion de session",
  "Exposition de données sensibles",
  "Entités externes XML (XXE)",
  "Contrôle d'accès défaillant (IDOR, BOLA)",
  "Mauvaise configuration de sécurité",
  "Cross-Site Scripting (XSS)",
  "Désérialisation non sécurisée",
  "Vulnérabilités de logique métier",
  "Divulgation d'informations",
  "Autre"
];

const SEVERITY_LEVELS: Array<{ value: Report["severity"]; label: string; color: string; description: string }> = [
  { value: "critique", label: "Critique", color: "bg-destructive text-destructive-foreground", description: "Contrôle total, RCE, accès DB total" },
  { value: "haute", label: "Haute", color: "bg-orange-500 text-white", description: "Accès données sensibles, IDOR critique" },
  { value: "moyenne", label: "Moyenne", color: "bg-yellow-500 text-black", description: "Impact partiel, contournement mineur" },
  { value: "faible", label: "Faible", color: "bg-blue-500 text-white", description: "Impact limité, exposition faible" },
  { value: "info", label: "Info", color: "bg-slate-500 text-white", description: "Best practices, info non sensible" },
];

const SoumettreRapport = () => {
  const { programmes, addReport } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programmeIdFromQuery = searchParams.get("programme");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    programmeId: programmeIdFromQuery || "",
    vulnerability: "",
    vrtCategory: VRT_CATEGORIES[0],
    severity: "moyenne" as Report["severity"],
    impactedAsset: "",
    description: "",
    steps: "",
    technicalImpact: "",
    businessImpact: "",
    httpLogs: "",
    remediation: "",
  });

  const [vrtSearch, setVrtSearch] = useState(form.vrtCategory);
  const [showVrtSuggestions, setShowVrtSuggestions] = useState(false);
  const vrtRef = useRef<HTMLDivElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [acceptAnalysis, setAcceptAnalysis] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const validations = useMemo(() => {
    return {
      programmeId: form.programmeId !== "",
      impactedAsset: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(form.impactedAsset.trim()) || form.impactedAsset.includes("://") || form.impactedAsset.split(".").length >= 2,
      vulnerability: form.vulnerability.length >= 3,
      title: form.title.length >= 10 && form.title.length <= 150,
      description: form.description.length >= 50,
      steps: form.steps.length >= 30,
    };
  }, [form]);

  useEffect(() => {
    if (programmeIdFromQuery) {
      setForm(prev => ({ ...prev, programmeId: programmeIdFromQuery }));
    }
  }, [programmeIdFromQuery]);

  // Click outside to close VRT suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vrtRef.current && !vrtRef.current.contains(event.target as Node)) {
        setShowVrtSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProgrammes = programmes.filter((programme) => programme.status === "actif");
  const selectedProgramme = programmes.find(p => p.id === form.programmeId);

  const filteredVrt = VRT_CATEGORIES.filter(c => 
    c.toLowerCase().includes(vrtSearch.toLowerCase())
  );

  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (screenshots.length + files.length > 5) {
      toast.error("Maximum 5 captures d'écran");
      return;
    }
    setScreenshots(prev => [...prev, ...files]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      toast.success("Rapport PDF joint");
    } else {
      toast.error("Le fichier doit être un PDF");
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!validations.programmeId) { toast.error("Veuillez sélectionner un programme"); return; }
      if (!validations.impactedAsset) { toast.error("Veuillez saisir un actif valide (ex: api.gabon.ga)"); return; }
      if (!validations.vulnerability) { toast.error("Le type de vulnérabilité est trop court"); return; }
    }
    if (step === 2) {
      if (!validations.title) { toast.error("Le titre doit faire entre 10 et 150 caractères"); return; }
      if (!validations.description) { toast.error("La description est trop courte (min 50 caractères)"); return; }
      if (!validations.steps) { toast.error("Les étapes de reproduction doivent être détaillées (min 30 caractères)"); return; }
    }
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    if (!pdfFile) {
      toast.error("Veuillez joindre le rapport PDF d'excellence");
      return;
    }
    if (!acceptAnalysis) {
      toast.error("Veuillez accepter l'analyse IA Smart-Triage™");
      return;
    }

    setSubmitting(true);
    addReport({
      title: form.title.trim(),
      description: `${form.description.trim()}\n\nREMEDIATION:\n${form.remediation.trim() || "Non spécifiée"}\n\nHTTP LOGS:\n${form.httpLogs.trim() || "Aucun log fourni"}`,
      severity: form.severity,
      hackerId: user?.id || "",
      hackerName: user?.name || "",
      programmeId: selectedProgramme!.id,
      programmeName: selectedProgramme!.name,
      entrepriseId: selectedProgramme!.entrepriseId,
      vulnerability: form.vulnerability.trim(),
      vrtCategory: vrtSearch.trim(),
      vrtType: form.vulnerability.trim(),
      proof: `Actif: ${form.impactedAsset.trim()}\nÉtapes:\n${form.steps.trim()}\n\nCaptures d'écran: ${screenshots.length} fichiers`,
      pdfFileName: pdfFile.name,
      analysisStatus: "en_attente",
    });

    toast.success("Rapport d'excellence envoyé ! Redirection vers vos rapports.");
    setTimeout(() => navigate("/hacker/rapports"), 2000);
  };

  const InputError = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return <p className="text-[9px] font-bold text-destructive animate-in fade-in slide-in-from-top-1 mt-1">{message}</p>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="container px-4 relative z-10 max-w-6xl">
          
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Rapport <span className="text-primary">Standard d'Excellence</span></h1>
            <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
              Chaque détail compte. Un rapport bien rédigé est un rapport validé plus rapidement.
            </p>
            
            {/* Stepper Progress */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all border-2 ${
                    step >= s ? "bg-primary border-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "bg-secondary border-border text-muted-foreground"
                  }`}>
                    {step > s ? <CheckCircle2 className="w-6 h-6" /> : `0${s}`}
                  </div>
                  {s < 3 && <div className={`h-1 w-16 md:w-24 rounded-full mx-2 ${step > s ? "bg-primary" : "bg-secondary"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[40px] border-border shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
            
            {/* Left Info Panel (Sticky on Desktop) */}
            <div className="w-full md:w-[300px] bg-secondary/30 p-8 border-b md:border-b-0 md:border-r border-border space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Guide de rédaction</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0"><Target className="w-3 h-3 text-primary" /></div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">Précisez l'actif impacté avec son URL complète.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0"><Zap className="w-3 h-3 text-primary" /></div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">Les étapes doivent être reproductibles par un tiers.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0"><ShieldCheck className="w-3 h-3 text-primary" /></div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">L'analyse d'impact business valorise votre prime.</p>
                  </div>
                </div>
              </div>

              {selectedProgramme && (
                <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Programme Cible</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0 overflow-hidden">
                      {selectedProgramme.logoUrl ? <img src={selectedProgramme.logoUrl} className="object-contain" /> : <Shield className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{selectedProgramme.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedProgramme.entrepriseName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Form Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                
                {/* Step 1: Context & Classification */}
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight">Classification de la Faille</h2>
                      <p className="text-sm text-muted-foreground">Définissez le contexte et la sévérité attendue.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Programme Cible *</label>
                        <select 
                          className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                          value={form.programmeId}
                          onChange={e => setForm(prev => ({ ...prev, programmeId: e.target.value }))}
                        >
                          <option value="">Choisir un partenaire...</option>
                          {activeProgrammes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actif Touché (URL/Host/IP) *</label>
                        <Input 
                          placeholder="Ex: api.gabon.ga, app.see-g.com..." 
                          value={form.impactedAsset}
                          onChange={e => setForm(prev => ({ ...prev, impactedAsset: e.target.value }))}
                          className={`h-12 bg-secondary/50 border-border font-mono text-xs ${form.impactedAsset && !validations.impactedAsset ? "border-destructive/50 ring-destructive/10" : ""}`}
                        />
                        <InputError show={form.impactedAsset !== "" && !validations.impactedAsset} message="Format d'actif invalide (ex: api.gabon.ga)" />
                      </div>

                      <div className="space-y-3 relative" ref={vrtRef}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catégorie VRT (Taxonomie) *</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Rechercher une catégorie (XSS, SQLi...)" 
                            value={vrtSearch}
                            onChange={(e) => {
                              setVrtSearch(e.target.value);
                              setShowVrtSuggestions(true);
                            }}
                            onFocus={() => setShowVrtSuggestions(true)}
                            className="h-12 bg-secondary/50 border-border pl-10 font-bold"
                          />
                        </div>
                        
                        {showVrtSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-2xl max-h-[250px] overflow-y-auto glass-card">
                            {filteredVrt.length > 0 ? (
                              filteredVrt.map((c, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setVrtSearch(c);
                                    setShowVrtSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-primary/10 transition-colors border-b border-border last:border-0"
                                >
                                  {c}
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-muted-foreground">
                                Aucune catégorie correspondante
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type Technique / CWE *</label>
                        <Input 
                          placeholder="Ex: Stored Cross-Site Scripting, CWE-79" 
                          value={form.vulnerability}
                          onChange={e => setForm(prev => ({ ...prev, vulnerability: e.target.value }))}
                          className="h-12 bg-secondary/50 font-bold"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sévérité Estimée *</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {SEVERITY_LEVELS.map(lvl => (
                            <button
                              key={lvl.value}
                              onClick={() => setForm(prev => ({ ...prev, severity: lvl.value }))}
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col gap-1 text-left ${
                                form.severity === lvl.value ? lvl.color + " border-transparent shadow-lg scale-[1.02]" : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/30"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-tighter">{lvl.label}</span>
                              <span className="text-[8px] font-medium leading-tight opacity-70">{lvl.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Technical Execution */}
                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Code2 className="w-7 h-7 text-primary" /> Détails de l'Exploitation
                      </h2>
                      <p className="text-sm text-muted-foreground">Démontrez la vulnérabilité de manière technique et rigoureuse.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Titre Descriptif *</label>
                        <Input 
                          placeholder="Ex: Account Takeover via Password Reset Token Leakage" 
                          value={form.title}
                          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                          className={`h-14 text-xl font-black bg-secondary/50 border-border ${form.title && !validations.title ? "border-destructive/50" : ""}`}
                        />
                        <InputError show={form.title !== "" && !validations.title} message="Le titre doit faire entre 10 et 150 caractères" />
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileText className="w-3 h-3 text-primary" /> Description Technique *
                          </label>
                          <Textarea 
                            placeholder="Fournissez le contexte technique, les endpoints vulnérables et la root cause..." 
                            value={form.description}
                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            className="min-h-[200px] bg-secondary/50 border-border resize-none text-sm leading-relaxed"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Activity className="w-3 h-3 text-primary" /> Étapes de Reproduction *
                          </label>
                          <Textarea 
                            placeholder="1. Login to application...\n2. Visit vulnerable endpoint...\n3. Use payload <script>alert(1)</script>..." 
                            value={form.steps}
                            onChange={e => setForm(prev => ({ ...prev, steps: e.target.value }))}
                            className="min-h-[200px] bg-secondary/50 border-border font-mono text-xs leading-relaxed"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" /> Logs HTTP Bruts (Request/Response)
                          </label>
                          <Textarea 
                            placeholder="POST /v1/auth HTTP/1.1\nHost: api.gabon.ga\n...\n\nHTTP/1.1 200 OK\n..." 
                            value={form.httpLogs}
                            onChange={e => setForm(prev => ({ ...prev, httpLogs: e.target.value }))}
                            className="min-h-[150px] bg-secondary/20 border-border font-mono text-[10px] leading-relaxed text-blue-400"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Hammer className="w-3 h-3 text-primary" /> Remédiation Suggérée
                          </label>
                          <Textarea 
                            placeholder="Ex: Implement CSRF tokens, Use parameterized queries, Sanitize user input..." 
                            value={form.remediation}
                            onChange={e => setForm(prev => ({ ...prev, remediation: e.target.value }))}
                            className="min-h-[150px] bg-secondary/20 border-border text-sm italic"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Evidence & Impact Analysis */}
                {step === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <ImageIcon className="w-7 h-7 text-primary" /> Preuves & Impacts
                      </h2>
                      <p className="text-sm text-muted-foreground">Ajoutez vos preuves visuelles et expliquez les conséquences réelles.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            Captures d'écran (Evidence)
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {screenshots.map((file, i) => (
                              <div key={i} className="aspect-video rounded-xl bg-secondary border border-border relative group overflow-hidden">
                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80" />
                                <button 
                                  onClick={() => removeScreenshot(i)}
                                  className="absolute top-1 right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {screenshots.length < 5 && (
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center transition-all bg-secondary/30"
                              >
                                <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                                <span className="text-[8px] font-black uppercase text-muted-foreground">Ajouter</span>
                              </button>
                            )}
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handleScreenshotChange} accept="image/*" className="hidden" multiple />
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            Rapport PDF Complet (Requis) *
                          </label>
                          <div className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all relative ${
                            pdfFile ? "border-primary bg-primary/5" : "border-border bg-secondary/20 hover:border-primary/40"
                          }`}>
                            <input type="file" onChange={handlePdfChange} accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <FileText className={`w-10 h-10 mx-auto mb-3 ${pdfFile ? "text-primary" : "text-muted-foreground/30"}`} />
                            <p className="text-xs font-bold">{pdfFile ? pdfFile.name : "Glissez votre PDF final ici"}</p>
                            <p className="text-[9px] uppercase font-bold text-muted-foreground mt-1">Format PDF · Max 10MB</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Impact Technique (Security Impact)</label>
                          <Textarea 
                            placeholder="Accès R/W à la base de données, exécution de code arbitraire, vol de jetons d'accès..." 
                            value={form.technicalImpact}
                            onChange={e => setForm(prev => ({ ...prev, technicalImpact: e.target.value }))}
                            className="h-24 bg-secondary/30 border-border"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Impact Métier (Business Impact)</label>
                          <Textarea 
                            placeholder="Risque de fuite RGPD, perte financière, interruption de service, dommage réputationnel..." 
                            value={form.businessImpact}
                            onChange={e => setForm(prev => ({ ...prev, businessImpact: e.target.value }))}
                            className="h-24 bg-secondary/30 border-border"
                          />
                        </div>

                        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-primary" />
                            <p className="text-xs font-black uppercase">Analyse IA Smart-Triage™</p>
                          </div>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={acceptAnalysis}
                              onChange={e => setAcceptAnalysis(e.target.checked)}
                              className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/20" 
                            />
                            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                              J'accepte que mon rapport soit traité par l'IA pour générer un résumé exécutif destiné à l'entreprise.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Navigation Footer */}
              <div className="p-8 bg-secondary/10 border-t border-border flex items-center justify-between">
                {step > 1 ? (
                  <Button variant="outline" onClick={prevStep} className="h-12 px-6 rounded-2xl font-bold border-border bg-background hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4 mr-2" /> PRÉCÉDENT
                  </Button>
                ) : <div />}

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest hidden md:block">
                    Étape {step} sur 3
                  </span>
                  {step < 3 ? (
                    <Button onClick={nextStep} className="h-12 px-10 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">
                      CONTINUER <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmit} 
                      disabled={submitting} 
                      className="h-12 px-12 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4 mr-2" /> {submitting ? "ENVOI EN COURS..." : "SOUMETTRE LE RAPPORT"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default SoumettreRapport;

// Add missing imports
import { Shield, Zap as ZapIcon } from "lucide-react";
