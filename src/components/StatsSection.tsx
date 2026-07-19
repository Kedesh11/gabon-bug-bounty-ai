import { Bug, Users, Building2, Zap, type LucideIcon } from "lucide-react";
import { useJsonContent } from "@/hooks/api/content";

interface Stat {
  id: string;
  value: string;
  label: string;
  color: "text-primary" | "text-accent";
}

// Icons are a display concern, not editable content — kept as a fixed local mapping
// by stat id instead of stored in ContentEntry (which only holds JSON-safe data).
const STAT_ICONS: Record<string, LucideIcon> = {
  bugs: Bug,
  hackers: Users,
  organisations: Building2,
  "response-time": Zap,
};

const DEFAULT_STATS: Stat[] = [
  { id: "bugs", value: "2,847", label: "Vulnérabilités détectées", color: "text-primary" },
  { id: "hackers", value: "1,200+", label: "Hackers éthiques", color: "text-accent" },
  { id: "organisations", value: "85", label: "Organisations protégées", color: "text-primary" },
  { id: "response-time", value: "< 4h", label: "Temps de réponse moyen", color: "text-accent" },
];

const StatsSection = () => {
  const rawStats = useJsonContent<Stat[]>("home.stats", DEFAULT_STATS);
  const stats = rawStats.map((s) => ({ ...s, icon: STAT_ICONS[s.id] ?? Zap }));

  return (
    <section className="py-20 relative">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.id}
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
