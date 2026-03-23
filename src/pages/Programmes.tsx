import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Shield, ExternalLink, Clock, DollarSign, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const programmes = [
  {
    name: "Ministère de l'Économie Numérique",
    scope: "*.economie-numerique.gouv.ga",
    rewards: "500 000 – 5 000 000 FCFA",
    severity: "Critique",
    hunters: 34,
    reports: 12,
    status: "Actif",
    tags: ["Web", "API", "Mobile"],
  },
  {
    name: "Banque Centrale (BEAC)",
    scope: "*.beac.int",
    rewards: "1 000 000 – 10 000 000 FCFA",
    severity: "Critique",
    hunters: 56,
    reports: 28,
    status: "Actif",
    tags: ["Web", "Infrastructure"],
  },
  {
    name: "Gabon Telecom",
    scope: "*.gabontelecom.ga",
    rewards: "250 000 – 3 000 000 FCFA",
    severity: "Haute",
    hunters: 21,
    reports: 7,
    status: "Actif",
    tags: ["Web", "API", "IoT"],
  },
  {
    name: "CNAMGS",
    scope: "*.cnamgs.ga",
    rewards: "300 000 – 4 000 000 FCFA",
    severity: "Haute",
    hunters: 18,
    reports: 5,
    status: "Actif",
    tags: ["Web", "Base de données"],
  },
  {
    name: "Port d'Owendo",
    scope: "*.portowendo.ga",
    rewards: "200 000 – 2 000 000 FCFA",
    severity: "Moyenne",
    hunters: 9,
    reports: 3,
    status: "Nouveau",
    tags: ["Web", "SCADA"],
  },
  {
    name: "Université Omar Bongo",
    scope: "*.uob.ga",
    rewards: "100 000 – 1 500 000 FCFA",
    severity: "Moyenne",
    hunters: 15,
    reports: 8,
    status: "Actif",
    tags: ["Web", "API"],
  },
];

const Programmes = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="container px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Explorer</span>
            <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
              <span className="text-foreground">Programmes </span>
              <span className="text-gradient-cyber">Bug Bounty</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez les organisations qui ont ouvert leurs systèmes aux hackers éthiques.
              Choisissez un programme et commencez à chasser.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {["Tous", "Actif", "Nouveau", "Critique", "Web", "API"].map((filter) => (
              <button
                key={filter}
                className="px-4 py-2 rounded-full text-sm font-mono glass-card border-glow text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Programme Cards */}
          <div className="grid gap-6">
            {programmes.map((prog, i) => (
              <div key={i} className="glass-card rounded-xl p-6 border-glow hover:cyber-glow transition-all duration-300 group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-foreground">{prog.name}</h3>
                      <Badge variant="outline" className={`font-mono text-xs ${prog.status === "Nouveau" ? "border-accent text-accent" : "border-primary text-primary"}`}>
                        {prog.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mb-3">{prog.scope}</p>
                    <div className="flex flex-wrap gap-2">
                      {prog.tags.map((tag) => (
                        <span key={tag} className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span>{prog.rewards}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span>{prog.severity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-accent" />
                      <span>{prog.hunters} hunters</span>
                    </div>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
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

export default Programmes;
