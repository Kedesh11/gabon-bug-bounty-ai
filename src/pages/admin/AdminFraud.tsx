import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, RefreshCw, Users, Handshake, Copy, CreditCard, Sparkles, Check, X, Eye } from "lucide-react";
import { useFraudSignals, useRunFraudScan, useUpdateFraudSignalStatus, type FraudSignal, type FraudSignalStatus, type FraudSignalType } from "@/hooks/api/fraud";
import { apiErrorMessage } from "@/lib/apiClient";

const TYPE_LABELS: Record<FraudSignalType, string> = {
  duplicate_account: "Multi-comptes",
  hacker_entreprise_collusion: "Collusion hacker-entreprise",
  plagiarized_report: "Rapport plagié",
  payment_anomaly: "Anomalie de paiement",
  llm_semantic_anomaly: "Anomalie sémantique (IA)",
};

const TYPE_ICONS: Record<FraudSignalType, typeof Users> = {
  duplicate_account: Users,
  hacker_entreprise_collusion: Handshake,
  plagiarized_report: Copy,
  payment_anomaly: CreditCard,
  llm_semantic_anomaly: Sparkles,
};

const STATUS_LABELS: Record<FraudSignalStatus, string> = {
  open: "Ouvert",
  reviewing: "En cours d'examen",
  confirmed: "Confirmé",
  dismissed: "Rejeté",
};

const STATUS_STYLES: Record<FraudSignalStatus, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/30",
  reviewing: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  confirmed: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  dismissed: "bg-secondary text-muted-foreground border-border",
};

const SEVERITY_STYLES: Record<string, string> = {
  critique: "bg-destructive text-destructive-foreground",
  haute: "bg-orange-500 text-white",
  moyenne: "bg-yellow-500 text-black",
  faible: "bg-blue-500 text-white",
  info: "bg-slate-500 text-white",
};

const STATUS_FILTERS: Array<{ value: FraudSignalStatus | "all"; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "open", label: "Ouverts" },
  { value: "reviewing", label: "En cours" },
  { value: "confirmed", label: "Confirmés" },
  { value: "dismissed", label: "Rejetés" },
];

function SignalCard({ signal }: { signal: FraudSignal }) {
  const updateStatus = useUpdateFraudSignalStatus();
  const Icon = TYPE_ICONS[signal.type];

  const setStatus = (status: FraudSignalStatus) => {
    updateStatus.mutate(
      { id: signal.id, status },
      {
        onSuccess: () => toast.success(`Signal marqué comme « ${STATUS_LABELS[status]} »`),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <div className="glass-card rounded-xl p-5 border-border space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{TYPE_LABELS[signal.type]}</p>
              <Badge className={`text-[9px] font-bold ${SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.info}`}>
                {signal.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className={`text-[9px] font-bold ${STATUS_STYLES[signal.status]}`}>
                {STATUS_LABELS[signal.status]}
              </Badge>
            </div>
            <p className="text-sm font-bold text-foreground mt-1">{signal.summary}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">{new Date(signal.createdAt).toLocaleString("fr-FR")}</p>
          </div>
        </div>
      </div>

      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer font-bold flex items-center gap-1 w-fit">
          <Eye className="w-3 h-3" /> Détails techniques
        </summary>
        <pre className="mt-2 p-3 rounded-lg bg-secondary/40 overflow-x-auto font-mono text-[10px]">
          {JSON.stringify(signal.details, null, 2)}
        </pre>
      </details>

      {(signal.status === "open" || signal.status === "reviewing") && (
        <div className="flex items-center gap-2 pt-1">
          {signal.status === "open" && (
            <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => setStatus("reviewing")} disabled={updateStatus.isPending}>
              EXAMINER
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[10px] font-bold border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setStatus("confirmed")}
            disabled={updateStatus.isPending}
          >
            <Check className="w-3 h-3 mr-1" /> CONFIRMER
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[10px] font-bold text-muted-foreground"
            onClick={() => setStatus("dismissed")}
            disabled={updateStatus.isPending}
          >
            <X className="w-3 h-3 mr-1" /> REJETER
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminFraud() {
  const [statusFilter, setStatusFilter] = useState<FraudSignalStatus | "all">("open");
  const { data: signals = [], isLoading } = useFraudSignals(statusFilter === "all" ? {} : { status: statusFilter });
  const runScan = useRunFraudScan();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" /> Détection de fraude
            </h1>
            <p className="text-sm text-muted-foreground">
              Signaux heuristiques à revue humaine — rien n'est bloqué automatiquement.
            </p>
          </div>
          <Button
            className="gap-2 font-bold"
            onClick={() =>
              runScan.mutate(undefined, {
                onSuccess: (res) => toast.success(res.created > 0 ? `${res.created} nouveau(x) signal(aux) détecté(s)` : "Aucun nouveau signal détecté"),
                onError: (err) => toast.error(apiErrorMessage(err)),
              })
            }
            disabled={runScan.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${runScan.isPending ? "animate-spin" : ""}`} /> LANCER L'ANALYSE
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                statusFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : signals.length === 0 ? (
            <div className="glass-card rounded-xl p-10 border-border text-center">
              <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground">Aucun signal</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lancez une analyse pour examiner les comptes, rapports et versements récents.
              </p>
            </div>
          ) : (
            signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
