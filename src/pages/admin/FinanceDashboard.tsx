import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import {
  DollarSign,
  CreditCard,
  History,
  Wallet,
  PieChart,
  ArrowUpRight,
  Download,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function FinanceDashboard() {
  const { reports } = useData();
  const paidReports = reports.filter(r => r.reward > 0);
  const totalBounties = paidReports.reduce((s, r) => s + r.reward, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
              <Wallet className="w-8 h-8 text-green-500" /> Finance Hub
            </h1>
            <p className="text-muted-foreground">Gestion des flux financiers, budgets et versements de primes.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="font-bold gap-2">
              <Download className="w-4 h-4" /> RAPPORT FISCAL
            </Button>
            <Button className="bg-green-600 text-white hover:bg-green-700 font-bold gap-2">
              <CreditCard className="w-4 h-4" /> PAYER LA FILE
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-6 border-border bg-gradient-to-br from-background to-green-500/5">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Total Bounties Payés</p>
            <p className="text-4xl font-black text-foreground">{totalBounties.toLocaleString()} <span className="text-sm font-normal">XAF</span></p>
            <div className="flex items-center gap-2 mt-4 text-green-500 font-bold text-xs">
              <ArrowUpRight className="w-4 h-4" /> +15.4% ce mois
            </div>
          </Card>
          
          <Card className="glass-card p-6 border-border">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Budget Global Alloué</p>
            <p className="text-4xl font-black text-foreground">50,000,000 <span className="text-sm font-normal">XAF</span></p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Consommation</span>
                <span>{Math.round((totalBounties / 50000000) * 100)}%</span>
              </div>
              <Progress value={(totalBounties / 50000000) * 100} className="h-1.5 bg-secondary" />
            </div>
          </Card>

          <Card className="glass-card p-6 border-border">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">En Attente de Versement</p>
            <p className="text-4xl font-black text-yellow-500">4,250,000 <span className="text-sm font-normal text-muted-foreground">XAF</span></p>
            <div className="flex items-center gap-2 mt-4 text-muted-foreground font-bold text-xs">
              <History className="w-4 h-4" /> 12 transactions prêtes
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/30 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Dernières Transactions
              </h3>
              <Badge variant="outline">VOIR TOUT</Badge>
            </div>
            <div className="divide-y divide-border">
              {paidReports.slice(0, 6).map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{r.hackerName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{r.programmeName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">-{r.reward.toLocaleString()} XAF</p>
                    <p className="text-[10px] text-muted-foreground">{r.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="glass-card p-6 border-border space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4 text-accent" /> Top Programmes (Coût)
              </h3>
              <div className="space-y-4">
                <BudgetUsage label="SEEG Gabon" spent="12.5M" progress={75} />
                <BudgetUsage label="Ministère de l'Économie" spent="8.2M" progress={45} />
                <Badge variant="outline" className="w-full justify-center py-2 text-[10px] font-bold uppercase tracking-widest">Voir le détail par actif</Badge>
              </div>
            </Card>

            <Card className="glass-card p-6 border-border bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">Compliance Status</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Vérification KYC terminée</li>
                <li className="flex items-center gap-2 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Retenues fiscales appliquées</li>
                <li className="flex items-center gap-2 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> 2 audits en attente (Q2)</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function BudgetUsage({ label, spent, progress }: { label: string, spent: string, progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="text-primary">{spent} XAF</span>
      </div>
      <Progress value={progress} className="h-1.5 bg-secondary" />
    </div>
  );
}
