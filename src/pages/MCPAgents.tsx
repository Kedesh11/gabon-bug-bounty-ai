import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Brain, AlertTriangle, ShieldCheck, Lightbulb, Coins, SearchCheck, ArrowRight, Zap, Activity, Network, Sparkles, type LucideIcon } from "lucide-react";
import { useMcpAgentStats } from "@/hooks/api/mcpAgents";
import { useJsonContent } from "@/hooks/api/content";

interface Agent {
  id: string;
  name: string;
  model: string;
  description: string;
  capabilities: string[];
}

interface WorkflowStep {
  step: string;
  label: string;
  desc: string;
}

// Icons are a display concern, not editable content — kept as a fixed local mapping
// by agent id instead of stored in ContentEntry (which only holds JSON-safe data).
const AGENT_ICONS: Record<string, LucideIcon> = {
  "vulnerability-analysis": SearchCheck,
  "severity-assessment": AlertTriangle,
  "false-positive-detection": ShieldCheck,
  "anti-fraud": Sparkles,
  recommendation: Lightbulb,
  decision: Brain,
  reward: Coins,
};

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "vulnerability-analysis",
    name: "Agent d'Analyse des Vulnérabilités",
    model: "DeepSeek",
    description: "Classe chaque rapport dans la taxonomie VRT de la plateforme et identifie le CWE correspondant.",
    capabilities: ["Classification dans le catalogue VRT existant", "Identification du CWE", "Analyse fondée strictement sur le rapport soumis", "Propose une nouvelle catégorie si aucune ne correspond"],
  },
  {
    id: "severity-assessment",
    name: "Agent d'Évaluation de la Sévérité",
    model: "DeepSeek",
    description: "Score CVSS v3.1 (vecteur et note) et sévérité suggérée, à partir de la classification établie.",
    capabilities: ["Scoring CVSS v3.1", "Vérifie la cohérence avec un CVSS déjà fourni par le hacker", "Prise en compte de la catégorie de vulnérabilité identifiée"],
  },
  {
    id: "false-positive-detection",
    name: "Agent de Détection de Faux Positifs",
    model: "Qwen",
    description: "Évalue la plausibilité et la reproductibilité du rapport à partir des preuves fournies.",
    capabilities: ["Analyse de cohérence des preuves", "Évaluation de la reproductibilité décrite", "Tient compte du contrôle de doublon exact déjà effectué par la plateforme"],
  },
  {
    id: "anti-fraud",
    name: "Agent Anti-Fraude",
    model: "Qwen",
    description: "Détection sémantique — paraphrase, incohérences internes, signes de copie d'un write-up public. Complète le contrôle de similarité textuelle déjà en place.",
    capabilities: ["Détection de paraphrase (au-delà du copier-coller exact)", "Recherche d'incohérences internes au rapport", "Génère un signal de fraude réservé à la revue humaine — aucun blocage automatique"],
  },
  {
    id: "recommendation",
    name: "Agent de Recommandation",
    model: "Kimi",
    description: "Complète la remédiation seulement si celle du hacker est absente ou insuffisante — ne la remplace jamais.",
    capabilities: ["Respecte la remédiation déjà proposée par le hacker si elle est suffisante", "Suggestions ancrées dans la catégorie de vulnérabilité identifiée", "N'invente rien qui ne découle pas du rapport"],
  },
  {
    id: "decision",
    name: "Agent de Décision",
    model: "ChatGPT",
    description: "Synthétise les analyses des agents précédents en une décision suggérée — jamais appliquée automatiquement.",
    capabilities: ["Synthèse de toutes les analyses en amont", "Suggestion : accepter / rejeter / demander des informations", "Toujours soumise à la validation de la triage humaine"],
  },
  {
    id: "reward",
    name: "Agent de Gestion des Récompenses",
    model: "ChatGPT",
    description: "Montant suggéré, ancré dans les tiers de récompense réels du programme concerné — jamais versé automatiquement.",
    capabilities: ["Respecte les tiers min/max définis par le programme", "Cohérent avec la sévérité retenue", "Suggestion pré-remplie, validée manuellement par la finance"],
  },
];

const DEFAULT_WORKFLOW: WorkflowStep[] = [
  { step: "1", label: "Soumission", desc: "Le hacker soumet son rapport" },
  { step: "2", label: "Analyse", desc: "Classification automatique" },
  { step: "3", label: "Évaluation", desc: "Scoring de sévérité" },
  { step: "4", label: "Vérification", desc: "Faux positifs & anti-fraude" },
  { step: "5", label: "Recommandation", desc: "Enrichissement si nécessaire" },
  { step: "6", label: "Décision", desc: "Suggestion soumise à la triage" },
];

const MCPAgents = () => {
  const { data: stats } = useMcpAgentStats();
  const rawAgents = useJsonContent<Agent[]>("mcp-agents.agents", DEFAULT_AGENTS);
  const agents = rawAgents.map((a) => ({ ...a, icon: AGENT_ICONS[a.id] ?? Brain }));
  const workflow = useJsonContent<WorkflowStep[]>("mcp-agents.workflow", DEFAULT_WORKFLOW);

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
              Un système de 7 agents spécialisés, chacun porté par un modèle différent (DeepSeek, Qwen, Kimi, ChatGPT via OpenRouter),
              qui analysent chaque rapport en s'appuyant strictement sur son contenu — leurs suggestions sont toujours validées par un humain.
            </p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Network, label: "Agents actifs", value: "7" },
              { icon: Brain, label: "Rapports analysés", value: stats ? stats.totalRuns.toLocaleString("fr-FR") : "—" },
              { icon: Activity, label: "Taux de complétion", value: stats?.completionRate != null ? `${(stats.completionRate * 100).toFixed(0)}%` : "—" },
              { icon: Zap, label: "Modèles distincts", value: "4" },
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
            {agents.map((agent) => (
              <div key={agent.id} className="glass-card rounded-xl p-6 border-glow hover:cyber-glow transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <agent.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground">{agent.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/30 text-primary shrink-0">{agent.model}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-mono text-primary uppercase mb-2">Capacités</p>
                  <ul className="space-y-1">
                    {agent.capabilities.map((cap, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">›</span> {cap}
                      </li>
                    ))}
                  </ul>
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
