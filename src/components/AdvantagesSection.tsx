import { Rocket, Eye, TrendingUp, Clock, MessageSquare, Shield } from "lucide-react";

const columns = [
  {
    title: "Plateforme",
    items: [
      { icon: Rocket, text: "Automatisation massive" },
      { icon: TrendingUp, text: "Scalabilité illimitée" },
    ],
  },
  {
    title: "Organisations",
    items: [
      { icon: Clock, text: "Réactivité accrue" },
      { icon: Eye, text: "Priorisation efficace" },
    ],
  },
  {
    title: "Hackers",
    items: [
      { icon: MessageSquare, text: "Feedback intelligent" },
      { icon: Shield, text: "Processus transparent" },
    ],
  },
];

const AdvantagesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="text-center mb-16">
          <span className="font-mono text-primary text-sm tracking-widest uppercase">Avantages</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-foreground">
            Pour <span className="text-gradient-cyber">Tous</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {columns.map((col, i) => (
            <div key={i} className="glass-card rounded-xl p-8 border-glow">
              <h3 className="text-xl font-bold text-primary mb-6 font-mono">{col.title}</h3>
              <div className="space-y-4">
                {col.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdvantagesSection;
