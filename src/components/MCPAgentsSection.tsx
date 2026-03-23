import { Brain, AlertTriangle, ShieldCheck, Lightbulb, Coins, SearchCheck } from "lucide-react";

const agents = [
  {
    icon: SearchCheck,
    name: "Agent d'Analyse",
    description: "Classification automatique des vulnérabilités (XSS, SQLi, RCE...)",
    status: "ACTIF",
  },
  {
    icon: AlertTriangle,
    name: "Agent de Sévérité",
    description: "Scoring basé sur les standards internationaux CVSS",
    status: "ACTIF",
  },
  {
    icon: ShieldCheck,
    name: "Agent Anti-Fraude",
    description: "Détection de spam, doublons et faux positifs",
    status: "ACTIF",
  },
  {
    icon: Brain,
    name: "Agent Décisionnel",
    description: "Acceptation, rejet ou demande d'informations complémentaires",
    status: "ACTIF",
  },
  {
    icon: Lightbulb,
    name: "Agent de Recommandation",
    description: "Suggestions de patchs et bonnes pratiques de correction",
    status: "ACTIF",
  },
  {
    icon: Coins,
    name: "Agent Récompenses",
    description: "Calcul automatique basé sur gravité, impact et complexité",
    status: "ACTIF",
  },
];

const MCPAgentsSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="container px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-mono text-primary text-sm tracking-widest uppercase">Architecture MCP</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4">
            <span className="text-foreground">6 Agents </span>
            <span className="text-gradient-cyber">Intelligents</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Un système multi-agents coordonné pour analyser, décider et agir en temps réel.
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-6 border-glow hover:cyber-glow transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:cyber-glow-strong transition-all">
                  <agent.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                  {agent.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{agent.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MCPAgentsSection;
