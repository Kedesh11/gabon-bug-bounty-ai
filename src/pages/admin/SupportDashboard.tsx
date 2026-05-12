import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { 
  MessageSquare, 
  Users, 
  LifeBuoy, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ShieldQuestion, 
  UserCheck,
  Search,
  ChevronRight,
  Filter,
  BarChart2,
  Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SupportDashboard() {
  const { hackers, entreprises } = useData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
              <LifeBuoy className="w-8 h-8 text-blue-500" /> Support Desk
            </h1>
            <p className="text-muted-foreground">Gestion de la relation utilisateur, médiation et assistance technique.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Satisfaction</p>
              <p className="text-xl font-black text-blue-500">4.8/5</p>
            </div>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 font-bold gap-2">
              <MessageSquare className="w-4 h-4" /> NOUVEAU TICKET
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Mail className="w-5 h-5 text-blue-500" />} label="Tickets Ouverts" value="24" subValue="8 urgents" />
          <StatCard icon={<ShieldQuestion className="w-5 h-5 text-orange-500" />} label="Litiges (Appels)" value="7" subValue="En cours de revue" />
          <StatCard icon={<UserCheck className="w-5 h-5 text-green-500" />} label="Vérifications KYC" value="12" subValue="En attente" />
          <StatCard icon={<BarChart2 className="w-5 h-5 text-primary" />} label="Temps Réponse" value="45m" subValue="Moyenne platforme" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher un ticket, un utilisateur..." className="pl-10 bg-secondary/30 border-border" />
              </div>
              <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
            </div>

            <div className="glass-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Tickets Récents
                </h3>
              </div>
              <div className="divide-y divide-border">
                {[
                  { id: "TK-402", user: "Hacker_X", subject: "Appel sur rapport #902", category: "Litige", status: "ouvert", priority: "haute" },
                  { id: "TK-403", user: "SEEG Gabon", subject: "Problème d'accès API", category: "Technique", status: "en_cours", priority: "moyenne" },
                  { id: "TK-404", user: "Hacker_Y", subject: "Question sur le versement XAF", category: "Finance", status: "fermé", priority: "faible" },
                ].map((tk) => (
                  <div key={tk.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tk.priority === "haute" ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-500"
                      }`}>
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{tk.subject}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{tk.id} • {tk.user} • {tk.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase ${
                        tk.status === "ouvert" ? "text-destructive border-destructive/20 bg-destructive/5" :
                        tk.status === "en_cours" ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                        "text-green-500 border-green-500/20 bg-green-500/5"
                      }`}>{tk.status}</Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-border group-hover:border-primary transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="glass-card p-6 border-border space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Modération Utilisateurs
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">H</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Hacker_Shadow</p>
                      <p className="text-[10px] text-muted-foreground">Signalé pour spam</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold">REVUE</Button>
                </div>
                <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest">Voir tous les signalements</Button>
              </div>
            </Card>

            <Card className="glass-card p-6 border-border space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldQuestion className="w-4 h-4 text-accent" /> Base de Connaissances
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "Mettez à jour la FAQ sur les nouvelles taxes sur les versements XAF avant vendredi."
              </p>
              <Button className="w-full text-[10px] font-black uppercase tracking-widest gap-2">
                <CheckCircle className="w-4 h-4" /> MODIFIER LA DOCUMENTATION
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue: string }) {
  return (
    <Card className="glass-card p-5 border-border flex flex-col gap-3 group hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <div>
        <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
        <p className="text-[10px] text-muted-foreground font-bold">{subValue}</p>
      </div>
    </Card>
  );
}
