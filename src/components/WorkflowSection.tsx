import { FileText, Cpu, BarChart3, CheckCircle, Bell, ArrowRight } from "lucide-react";

const steps = [
  { icon: FileText, label: "Soumission", description: "Rapport envoyé par le hacker" },
  { icon: Cpu, label: "Analyse MCP", description: "Classification automatique" },
  { icon: BarChart3, label: "Évaluation", description: "Scoring de sévérité" },
  { icon: CheckCircle, label: "Décision", description: "Accepter / Rejeter / Compléter" },
  { icon: Bell, label: "Notification", description: "Organisation alertée" },
];

const WorkflowSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4">
        <div className="text-center mb-16">
          <span className="font-mono text-accent text-sm tracking-widest uppercase">Workflow</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-foreground">
            Pipeline <span className="text-gradient-cyber">Intelligent</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Du rapport à la résolution, chaque étape est optimisée par les agents MCP.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="glass-card rounded-xl p-6 border-glow text-center min-w-[180px] hover:cyber-glow transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-foreground text-sm">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-6 h-6 text-primary/40 mx-2 hidden md:block flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
