import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProgramme } from "@/hooks/api/programmes";
import {
  Shield,
  DollarSign,
  AlertTriangle,
  Globe,
  ChevronLeft,
  Building2,
  Lock,
  Flag,
  Info,
  Send,
  History,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ProgrammeDetails = () => {
  const { id } = useParams();
  const { data: programme, isLoading } = useProgramme(id);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto" />
          <h1 className="text-2xl font-black">Programme introuvable</h1>
          <Button variant="outline" onClick={() => navigate("/programmes")}>Retour aux programmes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Header */}
      <section className="pt-32 pb-12 bg-secondary/20 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Link to="/programmes" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8">
              <ChevronLeft className="w-4 h-4 mr-1" /> Retour au catalogue
            </Link>

            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-[32px] bg-background border border-border p-4 flex items-center justify-center shadow-2xl shrink-0">
                {programme.logoUrl ? <img src={programme.logoUrl} className="object-contain" /> : <Shield className="w-12 h-12 text-primary" />}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter">{programme.name}</h1>
                  {programme.isNew && <Badge className="bg-accent text-accent-foreground font-black px-3">NOUVEAU</Badge>}
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wider">{programme.entrepriseName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <a href={programme.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4">{programme.website?.replace("https://", "")}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-green-500">{programme.status === "actif" ? "Acceptation des rapports" : "En pause"}</span>
                  </div>
                </div>
              </div>

              <div className="lg:text-right space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Prime Maximale</p>
                <div className="text-4xl md:text-5xl font-black tracking-tighter text-foreground flex items-baseline lg:justify-end gap-2">
                  {programme.maxReward.toLocaleString()} <span className="text-lg font-bold text-muted-foreground">XAF</span>
                </div>
                <div className="flex lg:justify-end">
                   <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black">TOP 1% PAYOUT</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="py-12">
        <div className="container px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Main Content Area */}
            <div className="lg:col-span-8">
              <Tabs defaultValue="apercu" className="space-y-8">
                <TabsList className="bg-secondary/50 p-1 rounded-2xl border border-border w-full justify-start overflow-x-auto">
                  <TabsTrigger value="apercu" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">Aperçu</TabsTrigger>
                  <TabsTrigger value="perimetre" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">Périmètre</TabsTrigger>
                  <TabsTrigger value="recompenses" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">Récompenses</TabsTrigger>
                  <TabsTrigger value="regles" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">Règles</TabsTrigger>
                </TabsList>

                <TabsContent value="apercu" className="space-y-12 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight">Introduction du Programme</h2>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {programme.descriptionLong || programme.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-secondary/10 border-border space-y-4">
                      <div className="flex items-center gap-3 text-primary">
                        <Lock className="w-5 h-5" />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Safe Harbor</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {programme.safeHarbor === "complet" 
                          ? "Ce programme bénéficie d'un Safe Harbor complet. Les chercheurs agissant de bonne foi ne seront pas poursuivis." 
                          : "Safe harbor partiel. Veuillez lire attentivement les conditions juridiques."}
                      </p>
                    </Card>
                    <Card className="p-6 bg-secondary/10 border-border space-y-4">
                      <div className="flex items-center gap-3 text-accent">
                        <Flag className="w-5 h-5" />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Périmètre de Recherche</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Focus sur les injections SQL, XSS, et les contournements de logique métier sur les endpoints critiques.
                      </p>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-black tracking-tight">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {programme.tags?.map(t => <Badge key={t} className="bg-primary/10 text-primary border-primary/20 font-bold px-4 py-1">{t}</Badge>)}
                      <Badge variant="outline" className="font-bold px-4 py-1">Logic de paiement</Badge>
                      <Badge variant="outline" className="font-bold px-4 py-1">Authentification SSO</Badge>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="perimetre" className="space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black tracking-tight">Cibles autorisées</h2>
                      <Badge className="bg-green-500 text-white font-bold uppercase tracking-widest text-[10px]">In Scope</Badge>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-border">
                      <table className="w-full text-left">
                        <thead className="bg-secondary/50 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Actif / Endpoint</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Type</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Sévérité Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {programme.scope.map((s, i) => (
                            <tr key={i} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-6 py-4 font-mono text-sm text-primary">{s}</td>
                              <td className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Web Service</td>
                              <td className="px-6 py-4">
                                <Badge variant="outline" className="text-[10px] font-black border-destructive/20 text-destructive bg-destructive/5">CRITIQUE</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black tracking-tight">Hors périmètre</h2>
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive font-bold uppercase tracking-widest text-[10px]">Out of Scope</Badge>
                    </div>
                    <ul className="space-y-3 p-6 rounded-2xl bg-destructive/5 border border-destructive/10">
                      {programme.outOfScope?.map((os, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                          <AlertTriangle className="w-4 h-4 text-destructive/40" /> {os}
                        </li>
                      )) || <li className="text-sm text-muted-foreground italic">Aucune exclusion spécifique.</li>}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="recompenses" className="space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight">Grille des récompenses</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {programme.rewardTiers?.map((tier) => (
                        <Card key={tier.severity} className="p-6 border-border flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-all">
                          <div className={`absolute top-0 right-0 h-16 w-16 -mr-8 -mt-8 rotate-45 opacity-10 ${
                            tier.severity === "critique" ? "bg-destructive" : tier.severity === "haute" ? "bg-orange-500" : "bg-yellow-500"
                          }`} />
                          <Badge className={`w-fit font-black uppercase text-[10px] ${
                            tier.severity === "critique" ? "bg-destructive text-white" : 
                            tier.severity === "haute" ? "bg-orange-500 text-white" : 
                            tier.severity === "moyenne" ? "bg-yellow-500 text-black" : "bg-blue-500 text-white"
                          }`}>
                            {tier.severity}
                          </Badge>
                          <div className="space-y-1">
                            <p className="text-2xl font-black tracking-tighter">
                              {tier.max.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">XAF</span>
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Jusqu'à</p>
                          </div>
                          <p className="text-[10px] leading-relaxed text-muted-foreground font-medium italic">{tier.note}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <h3 className="font-black flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" /> Facteurs d'évaluation
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Les récompenses sont basées sur le **Vulnerability Rating Taxonomy (VRT)** de la plateforme. 
                      L'impact métier réel, la facilité d'exploitation et la qualité de la remédiation proposée peuvent influencer le montant final à la hausse comme à la baisse.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="regles" className="space-y-8 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight">Règles d'Engagement</h2>
                    <div className="space-y-4">
                      {programme.terms?.map((term, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-secondary/20 border border-border">
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-[10px]">{i+1}</div>
                          <p className="text-sm font-medium leading-relaxed">{term}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar Stats & Actions */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card rounded-[32px] border border-border p-8 space-y-8 sticky top-24">
                
                <div className="space-y-4">
                  <Button asChild className="w-full h-14 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                    <Link to={`/soumettre-rapport?programme=${programme.id}`}>
                      <Send className="w-5 h-5 mr-2" /> SOUMETTRE UN RAPPORT
                    </Link>
                  </Button>
                  <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
                    TEMPS DE RÉPONSE MOYEN : <span className="text-primary">{programme.firstResponseHours || 12}H</span>
                  </p>
                </div>

                <div className="space-y-6 border-t border-border pt-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Vitesse de Triage</span>
                      <span className="text-foreground">Rapide</span>
                    </div>
                    <Progress value={85} className="h-2 bg-secondary" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Validité</p>
                      <p className="text-lg font-black text-foreground">{programme.acceptanceRate || 82}%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Prime Moy.</p>
                      <p className="text-lg font-black text-foreground">{(programme.averagePayout || 250000).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Activité du Programme</h4>
                  <div className="space-y-4">
                    {programme.recentActivity?.slice(0, 3).map((act) => (
                      <div key={act.id} className="flex gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          act.type === "submission" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"
                        }`}>
                          {act.type === "submission" ? <History className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{act.title}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(act.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-[10px] text-muted-foreground italic">Aucune activité récente.</p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-center gap-4">
                  <Megaphone className="w-5 h-5 text-accent" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-accent">Annonce</p>
                    <p className="text-[11px] font-bold text-muted-foreground truncate">Périmètre étendu aux API v3 !</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default ProgrammeDetails;
