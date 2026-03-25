import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Trophy, Bug, Star, TrendingUp, Medal } from "lucide-react";

const hackers = [
  { rank: 1, name: "CyberPanther_GA", reputation: 4850, bugs: 67, critical: 12, badge: "Élite" },
  { rank: 2, name: "NightOwl_Hack", reputation: 4200, bugs: 54, critical: 9, badge: "Élite" },
  { rank: 3, name: "ZeroDay_LBV", reputation: 3780, bugs: 41, critical: 8, badge: "Expert" },
  { rank: 4, name: "GhostNet_241", reputation: 3100, bugs: 38, critical: 6, badge: "Expert" },
  { rank: 5, name: "BinaryStorm", reputation: 2900, bugs: 35, critical: 5, badge: "Expert" },
  { rank: 6, name: "HexHunter_GA", reputation: 2650, bugs: 29, critical: 4, badge: "Avancé" },
  { rank: 7, name: "ByteBreaker", reputation: 2400, bugs: 26, critical: 4, badge: "Avancé" },
  { rank: 8, name: "SecuRaptor", reputation: 2100, bugs: 22, critical: 3, badge: "Avancé" },
  { rank: 9, name: "PacketStorm_LBV", reputation: 1850, bugs: 19, critical: 2, badge: "Intermédiaire" },
  { rank: 10, name: "ShadowByte_GA", reputation: 1600, bugs: 15, critical: 2, badge: "Intermédiaire" },
];

const getRankColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
};

const getBadgeClass = (badge: string) => {
  switch (badge) {
    case "Élite": return "bg-primary/20 text-primary border-primary/30";
    case "Expert": return "bg-accent/20 text-accent border-accent/30";
    case "Avancé": return "bg-secondary text-secondary-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const Hackers = () => {
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
              { icon: Trophy, label: "Hackers actifs", value: "247" },
              { icon: Bug, label: "Bugs trouvés", value: "1,284" },
              { icon: Star, label: "Critiques résolus", value: "89" },
              { icon: TrendingUp, label: "Récompenses versées", value: "48M FCFA" },
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
            {hackers.map((hacker) => (
              <div
                key={hacker.rank}
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
                  <span className="font-mono text-primary font-bold">{hacker.reputation.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-1">pts</span>
                </div>
                <div className="col-span-2 font-mono text-foreground">{hacker.bugs}</div>
                <div className="col-span-1 font-mono text-destructive font-bold">{hacker.critical}</div>
                <div className="col-span-2">
                  <span className={`text-xs font-mono px-2 py-1 rounded border ${getBadgeClass(hacker.badge)}`}>
                    {hacker.badge}
                  </span>
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

export default Hackers;
