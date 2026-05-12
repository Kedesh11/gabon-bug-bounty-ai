import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/useAuth";
import { 
  Bug, 
  Trophy, 
  DollarSign, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  Zap, 
  Target, 
  Activity, 
  BarChart3, 
  Star,
  Search,
  ArrowRight,
  User,
  Medal,
  Flame,
  ChevronRight,
  History,
  UserCircle2
} from "lucide-react";
import { CrowdStream } from "@/components/CrowdStream";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function HackerDashboard() {
  const { user } = useAuth();
  const { reports, hackers, programmes } = useData();

  const myReports = reports.filter(r => r.hackerId === user?.id);
  const profile = hackers.find(h => h.id === user?.id);
  const activeProgrammes = programmes.filter(p => p.status === "actif").slice(0, 3);

  const totalRewards = myReports.reduce((s, r) => s + r.reward, 0);
  const accepted = myReports.filter(r => r.status === "accepté" || r.status === "résolu").length;
  
  const preferredCurrency = profile?.config?.preferredCurrency || "XAF";
  const currencySymbol = preferredCurrency === "XAF" ? "FCFA" : preferredCurrency === "USD" ? "$" : "€";
  
  // Convert rewards if necessary (simple mock conversion)
  const convertedRewards = preferredCurrency === "XAF" ? totalRewards : preferredCurrency === "USD" ? totalRewards / 600 : totalRewards / 650;

  // Calculate Signal (Acceptance Rate) and Impact (Average Severity)
  const signal = myReports.length > 0 ? Math.round((accepted / myReports.length) * 100) : 0;
  const impact = 4.2; // Mock impact score out of 5

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              Centre d'Élite <span className="text-primary font-mono text-sm px-2 py-0.5 bg-primary/10 border border-primary/20 rounded uppercase tracking-widest">Actif</span>
            </h1>
            <p className="text-muted-foreground font-medium">Bon retour, <span className="text-foreground font-bold">{user?.name}</span>. Votre statut de recherche est optimal.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {!profile?.config?.gainsEnabled && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 py-2 px-4 gap-2 hidden md:flex">
                <ShieldCheck className="w-4 h-4" /> CONFIGURATION PAIEMENT REQUISE
              </Badge>
            )}
            <Button asChild variant="outline" className="h-11 border-border bg-secondary/50 font-bold gap-2">
              <Link to="/programmes">
                <Search className="w-4 h-4" /> EXPLORER LES CIBLES
              </Link>
            </Button>
            <Button asChild className="h-11 bg-primary text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20">
              <Link to="/soumettre-rapport">
                <Zap className="w-4 h-4" /> NOUVEAU RAPPORT
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<Bug className="w-5 h-5 text-primary" />} 
                label="Soumissions" 
                value={myReports.length.toString()} 
                subValue="+2 ce mois"
                color="primary"
              />
              <StatCard 
                icon={<DollarSign className="w-5 h-5 text-green-500" />} 
                label={`Revenus (${preferredCurrency})`} 
                value={convertedRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                subValue={`Symbole: ${currencySymbol}`}
                color="green"
              />
              <StatCard 
                icon={<Activity className="w-5 h-5 text-accent" />} 
                label="Signal" 
                value={`${signal}%`} 
                subValue="Précision"
                color="accent"
              />
              <StatCard 
                icon={<Flame className="w-5 h-5 text-orange-500" />} 
                label="Impact" 
                value={impact.toString()} 
                subValue="Sur 5.0"
                color="orange"
              />
            </div>

            {/* Performance Analytics & Skills */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earnings & Reputation Chart Area */}
              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Performance Mensuelle
                  </h3>
                  <select className="bg-secondary text-[10px] font-bold px-2 py-1 rounded border border-border outline-none">
                    <option>2024</option>
                  </select>
                </div>
                
                <div className="h-48 flex items-end justify-between gap-2 px-2">
                  {[45, 60, 30, 80, 50, 90, 70].map((h, i) => (
                    <div key={i} className="w-full group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {h * 10}k
                      </div>
                      <div 
                        className="bg-primary/20 group-hover:bg-primary transition-all rounded-t-lg" 
                        style={{ height: `${h}%` }} 
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-tighter px-2">
                  <span>Jan</span><span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Juin</span><span>Juil</span>
                </div>
              </div>

              {/* Skills & Specialization */}
              <div className="glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" /> Spécialisation
                </h3>
                
                <div className="space-y-4">
                  <SkillProgress label="Web Application Security" value={85} color="bg-primary" />
                  <SkillProgress label="API & Microservices" value={65} color="bg-accent" />
                  <SkillProgress label="Mobile (Android/iOS)" value={30} color="bg-blue-500" />
                  <SkillProgress label="Infrastructure / Cloud" value={45} color="bg-orange-500" />
                </div>

                <div className="pt-4 flex flex-wrap gap-2">
                  {profile?.specialties?.map(s => (
                    <Badge key={s} variant="secondary" className="bg-secondary/50 text-[10px] font-bold uppercase">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Reports & Opportunities */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 glass-card rounded-2xl border border-border overflow-hidden">
                <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Soumissions Récentes
                  </h3>
                  <Button asChild variant="ghost" size="sm" className="text-[10px] font-bold h-7">
                    <Link to="/hacker/rapports">TOUT VOIR</Link>
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {myReports.slice(0, 4).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-muted-foreground uppercase">{r.programmeName}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[10px] font-mono text-muted-foreground">{r.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 ${
                          r.status === "accepté" || r.status === "résolu" ? "bg-primary/10 text-primary border-primary/20" :
                          r.status === "rejeté" ? "bg-destructive/10 text-destructive border-destructive/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        }`}>{r.status}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 glass-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-orange-500">
                  <Star className="w-4 h-4" /> Opportunités
                </h3>
                <div className="space-y-3">
                  {activeProgrammes.map(p => (
                    <Link key={p.id} to={`/programmes/${p.id}`} className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border group-hover:border-primary/20 transition-all">
                          {p.logoUrl ? <img src={p.logoUrl} className="object-contain p-1" /> : <ShieldCheck className="w-5 h-5 text-primary/40" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[10px] font-black text-green-500">{p.maxReward.toLocaleString()} XAF Max</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Button asChild variant="outline" className="w-full text-[10px] font-black tracking-widest uppercase">
                  <Link to="/programmes">Voir plus de programmes</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Profile & CrowdStream */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="glass-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-secondary/50 p-6 flex flex-col items-center text-center space-y-4 border-b border-border">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-0.5 shadow-xl">
                    <div className="h-full w-full rounded-2xl bg-background flex items-center justify-center overflow-hidden">
                      <UserCircle2 className="w-12 h-12 text-primary/50" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-black">#{profile?.rank || 99}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black tracking-tighter">{user?.name}</p>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Classement Global</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-3 py-1">ÉLITE</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{profile?.reputation || 0} PTS</Badge>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Niveau Suivant</span>
                    <span className="text-primary">75%</span>
                  </div>
                  <Progress value={75} className="h-2 bg-secondary" />
                  <p className="text-[9px] text-muted-foreground text-center">Encore 500 points pour le badge **Vanguard**</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Acceptés</p>
                    <p className="text-lg font-black text-foreground">{accepted}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Rang</p>
                    <p className="text-lg font-black text-foreground">Top 2%</p>
                  </div>
                </div>
              </div>
            </Card>

            <CrowdStream />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Subcomponents for better readability
function StatCard({ icon, label, value, subValue, color }: { icon: React.ReactNode, label: string, value: string, subValue: string, color: string }) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10",
    green: "bg-green-500/10",
    accent: "bg-accent/10",
    orange: "bg-orange-500/10",
  };
  
  return (
    <div className="glass-card group hover:border-foreground/20 transition-all rounded-2xl p-5 border-border shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
      <div className="mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
        {subValue}
      </div>
    </div>
  );
}

function SkillProgress({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
