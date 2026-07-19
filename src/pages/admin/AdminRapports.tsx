import DashboardLayout from "@/components/DashboardLayout";
import { useReports, useUpdateReport, useDeleteReport, useRunMcpAnalysis } from "@/hooks/api/reports";
import { apiErrorMessage } from "@/lib/apiClient";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, XCircle, Eye, Search, DollarSign, BrainCircuit, ShieldAlert, AlertTriangle, Info, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { McpAgentType, Report } from "@/types/domain";
import { useContent } from "@/hooks/api/content";

const MCP_AGENT_LABELS: Record<McpAgentType, string> = {
  vulnerability_analysis: "Analyse de vulnérabilité",
  severity_assessment: "Évaluation de sévérité",
  false_positive_detection: "Détection de faux positifs",
  anti_fraud: "Anti-fraude",
  recommendation: "Recommandation",
  decision: "Décision",
  reward: "Récompense",
};

const SEVERITY_COLORS: Record<string, string> = {
  critique: "bg-destructive/20 text-destructive border-destructive/20",
  haute: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  moyenne: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  faible: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  info: "bg-muted text-muted-foreground border-border",
};

const STATUS_COLORS: Record<string, string> = {
  soumis: "bg-blue-500/20 text-blue-400",
  en_analyse: "bg-yellow-500/20 text-yellow-400",
  accepté: "bg-primary/20 text-primary",
  rejeté: "bg-destructive/20 text-destructive",
  résolu: "bg-accent/20 text-accent",
};

export default function AdminRapports() {
  const pageTitle = useContent("admin.rapports.title", "Gestion des rapports");
  const emptyStateText = useContent("admin.rapports.empty-state", "Aucun rapport trouvé pour votre recherche.");
  const { user } = useAuth();
  const [detail, setDetail] = useState<Report | null>(null);
  // Poll while this report's MCP analysis is still running, so the "Analyse
  // multi-agents" panel updates on its own once the background pipeline finishes —
  // scoped to this one observer, doesn't turn on polling for other useReports() callers.
  const { data: reports = [], isLoading: reportsLoading } = useReports({
    refetchInterval: detail?.analysisStatus === "en_cours" ? 3000 : false,
  });
  const updateReport = useUpdateReport();
  const deleteReport = useDeleteReport();
  const runMcpAnalysis = useRunMcpAnalysis();
  const canTriage = user?.permissions.includes("reports.triage") ?? false;
  const [search, setSearch] = useState("");
  const [rewardInput, setRewardInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: the "File de Triage Global" widget on the dashboard links here
  // with ?id=<reportId> so opening a report from there jumps straight to its detail.
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || reportsLoading) return;
    const target = reports.find(r => r.id === id);
    if (target) {
      setDetail(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("id");
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, reportsLoading]);

  // Keeps the open detail panel in sync whenever `reports` refetches (polling above,
  // or any other mutation-triggered invalidation) instead of going stale after selection.
  useEffect(() => {
    if (!detail) return;
    const fresh = reports.find(r => r.id === detail.id);
    if (fresh) setDetail(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  const filtered = reports
    .filter(r => filterStatus === "all" || r.status === filterStatus)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.hackerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-foreground">{pageTitle}</h1>
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-primary/5 text-primary border-primary/20">
            <BrainCircuit className="w-3.5 h-3.5" />
            AI Triage Actif
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher un rapport, un hacker..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            <option value="all">Tous les statuts</option>
            <option value="soumis">Soumis</option>
            <option value="en_analyse">En analyse</option>
            <option value="accepté">Accepté</option>
            <option value="rejeté">Rejeté</option>
            <option value="résolu">Résolu</option>
          </select>
        </div>

        {detail && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="lg:col-span-2 glass-card rounded-xl p-6 border-glow space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">{detail.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Soumis par <span className="text-primary font-semibold">{detail.hackerName}</span> sur <span className="text-primary font-semibold">{detail.programmeName}</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={SEVERITY_COLORS[detail.severity]}>{detail.severity.toUpperCase()}</Badge>
                <Badge variant="outline" className={STATUS_COLORS[detail.status]}>{detail.status.toUpperCase()}</Badge>
                {detail.vrtCategory && <Badge variant="secondary" className="bg-secondary text-foreground">{detail.vrtCategory}</Badge>}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                  <div className="bg-secondary/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border/50">
                    {detail.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Vulnérabilité (VRT)</h4>
                    <p className="text-sm font-mono text-primary bg-primary/5 p-2 rounded border border-primary/10">
                      {detail.vrtType || detail.vulnerability}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Preuve de Concept</h4>
                    <p className="text-sm font-mono text-muted-foreground bg-secondary/50 p-2 rounded border border-border/50 truncate">
                      {detail.proof}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex flex-wrap items-center gap-4">
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => updateReport.mutate(
                    { id: detail.id, data: { status: "accepté" } },
                    { onSuccess: (updated) => { setDetail(updated); toast.success("Rapport accepté"); }, onError: (err) => toast.error(apiErrorMessage(err)) },
                  )}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Accepter
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateReport.mutate(
                    { id: detail.id, data: { status: "rejeté" } },
                    { onSuccess: (updated) => { setDetail(updated); toast.error("Rapport rejeté"); }, onError: (err) => toast.error(apiErrorMessage(err)) },
                  )}>
                    <XCircle className="w-4 h-4 mr-2" /> Rejeter
                  </Button>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Prime (XAF)" value={rewardInput} onChange={e => setRewardInput(e.target.value)} className="w-40 pl-8 bg-secondary border-border h-9 text-sm" />
                  </div>
                  <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => {
                    const v = parseInt(rewardInput);
                    if (v > 0) updateReport.mutate(
                      { id: detail.id, data: { reward: v } },
                      {
                        onSuccess: (updated) => { setDetail(updated); toast.success(`Récompense: ${v.toLocaleString()} XAF`); setRewardInput(""); },
                        onError: (err) => toast.error(apiErrorMessage(err)),
                      },
                    );
                  }}>
                    Payer
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* AI Triage Card */}
              <div className="glass-card rounded-xl p-5 border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <BrainCircuit className="w-5 h-5" />
                  <h4 className="font-bold text-sm">AI Triage Assistant™</h4>
                </div>
                
                {detail.aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Confiance IA</span>
                      <span className="text-xs font-bold text-primary">{(detail.aiAnalysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: `${detail.aiAnalysis.confidence * 100}%` }} />
                    </div>

                    <div className="p-3 rounded bg-background/50 border border-border/50">
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        "{detail.aiAnalysis.summary}"
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Sévérité suggérée :</span>
                        <Badge variant="outline" className={SEVERITY_COLORS[detail.aiAnalysis.suggestedSeverity]}>
                          {detail.aiAnalysis.suggestedSeverity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Doublon potentiel :</span>
                        <span className={detail.aiAnalysis.isDuplicate ? "text-destructive font-bold" : "text-green-500 font-bold"}>
                          {detail.aiAnalysis.isDuplicate ? "OUI" : "NON"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-muted-foreground italic text-center">L'IA analyse les vecteurs d'attaque...</p>
                  </div>
                )}
              </div>

              {/* MCP Multi-Agent Analysis Card — real, model-backed analysis (see
                  api/src/services/mcpAgents), distinct from the instant placeholder
                  check above. Suggestion-only: nothing here submits on its own. */}
              <div className="glass-card rounded-xl p-5 border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5" />
                    <h4 className="font-bold text-sm">Analyse multi-agents (MCP)</h4>
                  </div>
                  {canTriage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      disabled={runMcpAnalysis.isPending || detail.analysisStatus === "en_cours"}
                      onClick={() =>
                        runMcpAnalysis.mutate(detail.id, {
                          onSuccess: () => toast.success("Analyse relancée"),
                          onError: (err) => toast.error(apiErrorMessage(err)),
                        })
                      }
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${detail.analysisStatus === "en_cours" ? "animate-spin" : ""}`} />
                      Relancer
                    </Button>
                  )}
                </div>

                {(() => {
                  const run = detail.mcpAgentRuns?.[0];
                  if (detail.analysisStatus === "en_cours" || run?.status === "running") {
                    return (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] text-muted-foreground italic text-center">7 agents analysent le rapport...</p>
                      </div>
                    );
                  }
                  if (!run || run.outputs.length === 0) {
                    return (
                      <p className="text-[11px] text-muted-foreground italic text-center py-4">
                        Aucune analyse multi-agents pour ce rapport pour le moment.
                      </p>
                    );
                  }

                  const decisionOutput = run.outputs.find((o) => o.agentType === "decision" && o.status === "completed");
                  const decision = decisionOutput?.output as { suggestedStatus?: string; confidence?: number } | undefined;
                  const rewardOutput = run.outputs.find((o) => o.agentType === "reward" && o.status === "completed");
                  const reward = rewardOutput?.output as { suggestedReward?: number | null } | undefined;

                  return (
                    <div className="space-y-3">
                      {decision?.suggestedStatus && (
                        <div className="p-3 rounded bg-primary/5 border border-primary/20 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Décision suggérée</span>
                          <span className="text-xs font-black text-primary uppercase">
                            {decision.suggestedStatus} {decision.confidence != null && `(${(decision.confidence * 100).toFixed(0)}%)`}
                          </span>
                        </div>
                      )}

                      {canTriage && reward?.suggestedReward != null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-primary/30 text-primary hover:bg-primary/10 gap-2 text-[11px]"
                          onClick={() => {
                            setRewardInput(String(reward.suggestedReward));
                            toast.success("Récompense suggérée pré-remplie — cliquez sur Payer pour confirmer.");
                          }}
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Pré-remplir la récompense suggérée ({reward.suggestedReward!.toLocaleString("fr-FR")} XAF)
                        </Button>
                      )}

                      <div className="space-y-2">
                        {run.outputs.map((output) => (
                          <details key={output.id} className="border border-border/50 rounded-lg p-2 bg-background/40">
                            <summary className="cursor-pointer flex items-center justify-between font-bold text-foreground text-[11px]">
                              <span>{MCP_AGENT_LABELS[output.agentType]}</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${output.status === "completed" ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}
                              >
                                {output.status === "completed" ? "OK" : "ÉCHEC"}
                              </Badge>
                            </summary>
                            <div className="mt-2 text-[10px] text-muted-foreground font-mono">
                              {output.status === "completed" && output.output ? (
                                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(output.output, null, 2)}</pre>
                              ) : (
                                <p>{output.errorMessage ?? "Échec de l'analyse."}</p>
                              )}
                            </div>
                            <p className="mt-1 text-[9px] text-muted-foreground/70">{output.model}</p>
                          </details>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* History/Quick Stats Card */}
              <div className="glass-card rounded-xl p-5 border-border space-y-4">
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Historique Hacker</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Réputation</span>
                    <span className="font-bold text-foreground">2,450</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Bugs validés</span>
                    <span className="font-bold text-foreground">34</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Liste des rapports</h2>
          <div className="grid gap-3">
            {filtered.map(r => (
              <div key={r.id} className="glass-card group hover:border-primary/40 transition-all rounded-lg p-4 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                    {r.severity === "critique" ? <ShieldAlert className="w-5 h-5 text-destructive" /> : 
                     r.severity === "haute" ? <AlertTriangle className="w-5 h-5 text-orange-400" /> : 
                     <Info className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-medium text-primary">{r.hackerName}</span>
                      <span>•</span>
                      <span className="truncate">{r.programmeName}</span>
                      <span>•</span>
                      <span>{r.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={`text-[10px] py-0 h-5 ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</Badge>
                    <span className={`text-[10px] font-bold ${STATUS_COLORS[r.status]}`}>{r.status.toUpperCase()}</span>
                  </div>
                  {r.reward > 0 && (
                    <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                      <span className="text-xs font-black text-primary">{r.reward.toLocaleString()} XAF</span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setDetail(r); setRewardInput(""); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteReport.mutate(r.id, {
                      onSuccess: () => toast.error("Rapport supprimé"),
                      onError: (err) => toast.error(apiErrorMessage(err)),
                    })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 glass-card rounded-xl border-dashed">
              <p className="text-muted-foreground">{emptyStateText}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
