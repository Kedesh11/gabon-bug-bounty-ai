import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Brain, AlertTriangle, ShieldCheck, Lightbulb, Coins, SearchCheck, ArrowRight, Zap, Activity, Network } from "lucide-react";

const agents = [
  {
    icon: SearchCheck,
    name: "Agent d'Analyse des Vulnérabilités",
    description: "Comprend le contenu des rapports soumis et identifie le type de vulnérabilité.",
    capabilities: ["Classification automatique (XSS, SQLi, RCE, IDOR...)", "Analyse contextuelle du rapport", "Extraction des indicateurs techniques", "Corrélation avec la base de connaissances"],
    metrics: { precision: "97.3%", temps: "< 2s", rapports: "1,284" },
  },
  {
    icon: AlertTriangle,
    name: "Agent d'Évaluation de la Sévérité",
    description: "Évalue l'impact réel d'une vulnérabilité selon les standards internationaux.",
    capabilities: ["Scoring CVSS v3.1 automatisé", "Évaluation de l'impact métier", "Analyse du vecteur d'attaque", "Prise en compte du contexte organisationnel"],
    metrics: { precision: "95.8%", temps: "< 1s", rapports: "1,284" },
  },
  {
    icon: ShieldCheck,
    name: "Agent de Détection de Faux Positifs",
    description: "Identifie les rapports non valides, les doublons et le spam.",
    capabilities: ["Détection de rapports dupliqués", "Analyse de cohérence des preuves", "Vérification de la reproductibilité", "Identification de spam automatisé"],
    metrics: { precision: "99.1%", temps: "< 3s", rapports: "342" },
  },
  {
    icon: Brain,
    name: "Agent de Décision",
    description: "Détermine l'action optimale à entreprendre pour chaque rapport.",
    capabilities: ["Acceptation automatique des cas clairs", "Rejet motivé avec explications", "Demande d'informations complémentaires", "Escalade vers supervision humaine"],
    metrics: { precision: "93.5%", temps: "< 1s", rapports: "1,284" },
  },
  {
    icon: Lightbulb,
    name: "Agent de Recommandation",
    description: "Propose des solutions de correction adaptées à chaque vulnérabilité.",
    capabilities: ["Suggestions de patchs spécifiques", "Bonnes pratiques de sécurisation", "Références aux guides OWASP", "Plans de remédiation priorisés"],
    metrics: { precision: "91.2%", temps: "< 5s", rapports: "856" },
  },
  {
    icon: Coins,
    name: "Agent de Gestion des Récompenses",
    description: "Calcule la récompense appropriée selon des critères objectifs.",
    capabilities: ["Évaluation basée sur la gravité", "Pondération par complexité de découverte", "Ajustement selon l'impact réel", "Historique et cohérence des récompenses"],
    metrics: { precision: "98.7%", temps: "< 1s", rapports: "623" },
  },
];

const workflow = [
  { step: "1", label: "Soumission", desc: "Le hacker soumet son rapport" },
  { step: "2", label: "Analyse", desc: "Classification automatique" },
  { step: "3", label: "Évaluation", desc: "Scoring de sévérité" },
  { step: "4", label: "Vérification", desc: "Détection de faux positifs" },
  { step: "5", label: "Décision", desc: "Action automatisée" },
  { step: "6", label: "Notification", desc: "Alerte à l'organisation" },
];

const MCPAgents = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="container px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Multi-Agent Control Platform</span>
            <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
              <span className="text-foreground">Architecture </span>
              <span className="text-gradient-cyber">MCP</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un système d'intelligence composé de plusieurs agents spécialisés capables d'analyser,
              décider et s'adapter en temps réel.
            </p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Zap, label: "Temps moyen", value: "< 2s" },
              { icon: Activity, label: "Précision globale", value: "96.1%" },
              { icon: Network, label: "Agents actifs", value: "6" },
              { icon: Brain, label: "Décisions/jour", value: "450+" },
            ].map((m, i) => (
              <div key={i} className="glass-card rounded-xl p-5 border-glow text-center">
                <m.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-black text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground font-mono">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Workflow */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">Pipeline de Traitement</h2>
            <div className="flex flex-wrap justify-center items-center gap-2">
              {workflow.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="glass-card rounded-lg border-glow px-4 py-3 text-center min-w-[120px]">
                    <span className="font-mono text-primary text-xs">ÉTAPE {w.step}</span>
                    <p className="font-bold text-foreground text-sm">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.desc}</p>
                  </div>
                  {i < workflow.length - 1 && <ArrowRight className="w-4 h-4 text-primary hidden md:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* Agent cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {agents.map((agent, i) => (
              <div key={i} className="glass-card rounded-xl p-6 border-glow hover:cyber-glow transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <agent.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-mono text-primary uppercase mb-2">Capacités</p>
                  <ul className="space-y-1">
                    {agent.capabilities.map((cap, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">›</span> {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground font-mono">Précision</p>
                    <p className="font-bold text-primary text-sm">{agent.metrics.precision}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground font-mono">Temps</p>
                    <p className="font-bold text-foreground text-sm">{agent.metrics.temps}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground font-mono">Traités</p>
                    <p className="font-bold text-foreground text-sm">{agent.metrics.rapports}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default MCPAgents;
