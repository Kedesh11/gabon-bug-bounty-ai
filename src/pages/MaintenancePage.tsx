import { useEffect, useState } from "react";
import { Construction, Clock } from "lucide-react";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const MaintenancePage = ({ until }: { until: string | null }) => {
  const targetMs = until ? new Date(until).getTime() : null;
  const [remainingMs, setRemainingMs] = useState(() => (targetMs ? targetMs - Date.now() : 0));

  useEffect(() => {
    if (!targetMs) return;
    const interval = setInterval(() => setRemainingMs(targetMs - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  const isOver = targetMs !== null && remainingMs <= 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[100px] animate-pulse delay-700" />

      <div className="relative z-10 w-full max-w-lg px-4 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-2xl mb-6">
          <Construction className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Maintenance en cours</h1>
        <p className="text-muted-foreground font-medium max-w-md mx-auto mb-10">
          La plateforme est temporairement indisponible le temps d'une opération de maintenance.
          Merci de votre patience, nous serons bientôt de retour.
        </p>

        <div className="glass-card rounded-2xl border-glow p-8 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5" />
            {isOver ? "Fin de maintenance imminente" : "Temps restant estimé"}
          </p>
          {targetMs ? (
            <p className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-primary" aria-live="polite">
              {formatRemaining(remainingMs)}
            </p>
          ) : (
            <p className="text-lg font-bold text-muted-foreground">Durée non communiquée</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
