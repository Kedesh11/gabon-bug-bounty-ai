import { Bug, Users, Building2, Zap } from "lucide-react";

const stats = [
  { icon: Bug, value: "2,847", label: "Vulnérabilités détectées", color: "text-primary" },
  { icon: Users, value: "1,200+", label: "Hackers éthiques", color: "text-accent" },
  { icon: Building2, value: "85", label: "Organisations protégées", color: "text-primary" },
  { icon: Zap, value: "< 4h", label: "Temps de réponse moyen", color: "text-accent" },
];

const StatsSection = () => {
  return (
    <section className="py-20 relative">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-6 text-center border-glow hover:cyber-glow transition-all duration-300"
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
              <p className={`text-3xl md:text-4xl font-black font-mono ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
