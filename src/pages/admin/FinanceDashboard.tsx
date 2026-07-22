import DashboardLayout from "@/components/DashboardLayout";
import { useReports } from "@/hooks/api/reports";
import { usePayments, usePayouts } from "@/hooks/api/payments";
import { useComplianceItems, useCreateComplianceItem, useToggleComplianceItem, useDeleteComplianceItem } from "@/hooks/api/compliance";
import { buildTransactionFeed, topProgrammesByCost, pendingPayoutReports } from "@/lib/financeStats";
import {
  DollarSign,
  History,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/apiClient";
import { useContent } from "@/hooks/api/content";

export default function FinanceDashboard() {
  const pageTitle = useContent("admin.finance.title", "Finance Hub");
  const pageSubtitle = useContent("admin.finance.subtitle", "Gestion des flux financiers, budgets et versements de primes.");
  const transactionsHeading = useContent("admin.finance.transactions-heading", "Dernières Transactions");
  const topProgrammesHeading = useContent("admin.finance.top-programmes-heading", "Top Programmes (Coût)");
  const complianceHeading = useContent("admin.finance.compliance-heading", "Compliance Status");

  const { data: reports = [] } = useReports();
  const { data: payments = [] } = usePayments();
  const { data: payouts = [] } = usePayouts();
  const { data: complianceItems = [] } = useComplianceItems();
  const createComplianceItem = useCreateComplianceItem();
  const toggleComplianceItem = useToggleComplianceItem();
  const deleteComplianceItem = useDeleteComplianceItem();
  const [newItemLabel, setNewItemLabel] = useState("");

  const totalPaidOut = payouts.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  const pending = pendingPayoutReports(reports, payouts);
  const pendingTotal = pending.reduce((s, r) => s + r.reward, 0);
  const transactions = buildTransactionFeed(payments, payouts);
  const topProgrammes = topProgrammesByCost(payouts);
  const maxProgrammeCost = Math.max(1, ...topProgrammes.map((p) => p.total));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
              <Wallet className="w-8 h-8 text-green-500" /> {pageTitle}
            </h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-6 border-border bg-gradient-to-br from-background to-green-500/5">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Total Versé aux Hackers</p>
            <p className="text-4xl font-black text-foreground">{totalPaidOut.toLocaleString()} <span className="text-sm font-normal">XAF</span></p>
            <div className="flex items-center gap-2 mt-4 text-green-500 font-bold text-xs">
              <ArrowUpRight className="w-4 h-4" /> {payouts.filter((p) => p.status === "succeeded").length} versements réussis
            </div>
          </Card>

          <Card className="glass-card p-6 border-border">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Total Reçu des Entreprises</p>
            <p className="text-4xl font-black text-foreground">{totalReceived.toLocaleString()} <span className="text-sm font-normal">XAF</span></p>
            <div className="flex items-center gap-2 mt-4 text-blue-500 font-bold text-xs">
              <ArrowDownRight className="w-4 h-4" /> {payments.filter((p) => p.status === "succeeded").length} financements reçus
            </div>
          </Card>

          <Card className="glass-card p-6 border-border">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">En Attente de Versement</p>
            <p className="text-4xl font-black text-yellow-500">{pendingTotal.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">XAF</span></p>
            <div className="flex items-center gap-2 mt-4 text-muted-foreground font-bold text-xs">
              <History className="w-4 h-4" /> {pending.length} rapport{pending.length !== 1 ? "s" : ""} accepté{pending.length !== 1 ? "s" : ""} sans versement
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/30 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> {transactionsHeading}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.kind === "payout" ? "bg-green-500/10" : "bg-blue-500/10"}`}>
                      <DollarSign className={`w-5 h-5 ${tx.kind === "payout" ? "text-green-500" : "text-blue-500"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{tx.party}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{tx.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${tx.kind === "payout" ? "text-foreground" : "text-blue-500"}`}>
                      {tx.kind === "payout" ? "-" : "+"}{tx.amount.toLocaleString()} {tx.currency}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("fr-FR")} · {tx.status}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="p-8 text-sm text-muted-foreground text-center">Aucune transaction pour le moment.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="glass-card p-6 border-border space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4 text-accent" /> {topProgrammesHeading}
              </h3>
              <div className="space-y-4">
                {topProgrammes.map((p) => (
                  <div key={p.programmeId} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{p.programmeName}</span>
                      <span className="text-primary">{p.total.toLocaleString()} XAF</span>
                    </div>
                    <Progress value={(p.total / maxProgrammeCost) * 100} className="h-1.5 bg-secondary" />
                  </div>
                ))}
                {topProgrammes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun versement effectué pour le moment.</p>
                )}
              </div>
            </Card>

            <Card className="glass-card p-6 border-border bg-primary/5 border-primary/20 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">{complianceHeading}</h3>
              </div>
              <ul className="space-y-3">
                {complianceItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs font-medium group">
                    <Checkbox
                      checked={item.isDone}
                      onCheckedChange={(checked) => toggleComplianceItem.mutate(
                        { id: item.id, isDone: checked === true },
                        { onError: (err) => toast.error(apiErrorMessage(err)) },
                      )}
                    />
                    <span className={item.isDone ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComplianceItem.mutate(item.id, { onError: (err) => toast.error(apiErrorMessage(err)) })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </li>
                ))}
                {complianceItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun élément de conformité défini.</p>
                )}
              </ul>
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="Nouvel élément..."
                  className="h-8 text-xs bg-secondary/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemLabel.trim().length >= 2) {
                      createComplianceItem.mutate(newItemLabel.trim(), {
                        onSuccess: () => setNewItemLabel(""),
                        onError: (err) => toast.error(apiErrorMessage(err)),
                      });
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={newItemLabel.trim().length < 2 || createComplianceItem.isPending}
                  onClick={() => createComplianceItem.mutate(newItemLabel.trim(), {
                    onSuccess: () => setNewItemLabel(""),
                    onError: (err) => toast.error(apiErrorMessage(err)),
                  })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
