import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Trophy, Bug, Star, TrendingUp, Medal } from "lucide-react";
import { useHackerLeaderboard } from "@/hooks/api/hackers";
import { HackerLeaderboardEntry } from "@/lib/api/mappers";

const getRankColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
};

// No stored "level" concept on HackerProfile — derived client-side from reputation,
// same tiers the mock data used to hardcode per row.
function reputationTier(reputation: number): string {
  if (reputation >= 4000) return "Élite";
  if (reputation >= 3000) return "Expert";
  if (reputation >= 2000) return "Avancé";
  return "Intermédiaire";
}

const getBadgeClass = (badge: string) => {
  switch (badge) {
    case "Élite": return "bg-primary/20 text-primary border-primary/30";
    case "Expert": return "bg-accent/20 text-accent border-accent/30";
    case "Avancé": return "bg-secondary text-secondary-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

function computeStats(hackers: HackerLeaderboardEntry[]) {
  return {
    activeHackers: hackers.length,
    totalBugs: hackers.reduce((sum, h) => sum + h.bugsFound, 0),
    totalCritical: hackers.reduce((sum, h) => sum + h.criticalBugsCount, 0),
    totalRewards: hackers.reduce((sum, h) => sum + h.totalRewards, 0),
  };
}

const Hackers = () => {
  const { data: hackers = [], isLoading } = useHackerLeaderboard();
  const stats = computeStats(hackers);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="container px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Classement</span>
            <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
              <span className="text-foreground">Hall of </span>
              <span className="text-gradient-cyber">Fame</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Les meilleurs hackers éthiques de la plateforme. Rejoignez la communauté et grimpez dans le classement.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Trophy, label: "Hackers actifs", value: stats.activeHackers.toLocaleString("fr-FR") },
              { icon: Bug, label: "Bugs trouvés", value: stats.totalBugs.toLocaleString("fr-FR") },
              { icon: Star, label: "Critiques résolus", value: stats.totalCritical.toLocaleString("fr-FR") },
              { icon: TrendingUp, label: "Récompenses versées", value: `${stats.totalRewards.toLocaleString("fr-FR")} FCFA` },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4 border-glow text-center">
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-mono">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="glass-card rounded-xl border-glow overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">Rang</div>
              <div className="col-span-4">Hacker</div>
              <div className="col-span-2">Réputation</div>
              <div className="col-span-2">Bugs</div>
              <div className="col-span-1">Critiques</div>
              <div className="col-span-2">Niveau</div>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Chargement du classement…</p>
            ) : hackers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Aucun chercheur classé pour le moment.</p>
            ) : (
              hackers.map((hacker) => {
                const tier = reputationTier(hacker.reputation);
                return (
                  <div
                    key={hacker.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border/50 hover:bg-primary/5 transition-colors items-center"
                  >
                    <div className="col-span-1">
                      <span className={`font-mono font-bold text-lg ${getRankColor(hacker.rank)}`}>
                        {hacker.rank <= 3 ? <Medal className={`w-5 h-5 inline ${getRankColor(hacker.rank)}`} /> : `#${hacker.rank}`}
                      </span>
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="font-semibold text-foreground">{hacker.name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-mono text-primary font-bold">{hacker.reputation.toLocaleString("fr-FR")}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                    <div className="col-span-2 font-mono text-foreground">{hacker.bugsFound}</div>
                    <div className="col-span-1 font-mono text-destructive font-bold">{hacker.criticalBugsCount}</div>
                    <div className="col-span-2">
                      <span className={`text-xs font-mono px-2 py-1 rounded border ${getBadgeClass(tier)}`}>
                        {tier}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default Hackers;
