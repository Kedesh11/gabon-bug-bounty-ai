import { Shield, ChevronRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-pattern">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="container relative z-10 text-center px-4 py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-8 border-glow">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-mono text-primary">PLATEFORME NATIONALE</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[0.95]">
          <span className="text-foreground">Bug Bounty</span>
          <br />
          <span className="text-gradient-cyber">Gabon</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Système collaboratif de cybersécurité propulsé par des{" "}
          <span className="text-primary font-semibold">agents MCP intelligents</span>.
          Protégez vos infrastructures numériques avec les meilleurs hackers éthiques.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/soumettre-programme">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8 cyber-glow">
              <Shield className="w-5 h-5 mr-2" />
              Soumettre un programme
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/inscription">
            <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm px-8">
              <Terminal className="w-4 h-4 mr-2" />
              ./rejoindre --hacker
            </Button>
          </Link>
        </div>

        {/* Terminal preview */}
        <div className="mt-16 max-w-xl mx-auto glass-card rounded-lg border-glow overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-destructive/70" />
            <div className="w-3 h-3 rounded-full bg-warning/70" />
            <div className="w-3 h-3 rounded-full bg-primary/70" />
            <span className="text-xs font-mono text-muted-foreground ml-2">mcp-agent@gabon:~</span>
          </div>
          <div className="p-4 font-mono text-sm text-left space-y-1">
            <p className="text-muted-foreground">$ mcp analyze --report #2847</p>
            <p className="text-primary">⟩ Agent d'analyse activé...</p>
            <p className="text-accent">⟩ Vulnérabilité classifiée: SQL Injection</p>
            <p className="text-primary">⟩ Sévérité: <span className="text-destructive font-bold">CRITIQUE</span></p>
            <p className="text-muted-foreground">⟩ Recommandation générée ✓</p>
            <p className="text-primary animate-pulse">█</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
