import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Globe,
  ListChecks,
  Shield,
  Wallet,
  Info,
  ShieldCheck,
  Target,
  Trophy,
  History,
  Lock,
  ChevronRight,
  Star
} from "lucide-react";
import { useState } from "react";

import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEVERITY_ORDER: Array<"critique" | "haute" | "moyenne" | "faible"> = ["critique", "haute", "moyenne", "faible"];

const getSeverityLabel = (severity: "critique" | "haute" | "moyenne" | "faible") => {
  if (severity === "critique") return "Critique";
  if (severity === "haute") return "Haute";
  if (severity === "moyenne") return "Moyenne";
  return "Faible";
};

const SEVERITY_COLORS: Record<string, string> = {
  critique: "text-destructive border-destructive/20 bg-destructive/10",
  haute: "text-orange-500 border-orange-500/20 bg-orange-500/10",
  moyenne: "text-yellow-500 border-yellow-500/20 bg-yellow-500/10",
  faible: "text-blue-500 border-blue-500/20 bg-blue-500/10",
};

export default function ProgrammeDetail() {
  const { id } = useParams();
  const { programmes, reports } = useData();
  const [activeTab, setActiveTab] = useState("overview");

  const programme = programmes.find((entry) => entry.id === id);

  if (!programme) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-16 text-center">
          <h1 className="text-3xl font-black mb-6">Programme introuvable</h1>
          <Button asChild><Link to="/programmes">Retour aux programmes</Link></Button>
        </section>
        <FooterSection />
      </div>
    );
  }

  const programmeReports = reports.filter((entry) => entry.programmeId === programme.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Header Section */}
      <section className="pt-24 pb-8 bg-secondary/30 border-b border-border">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="relative shrink-0">
              {programme.logoUrl ? (
                <img src={programme.logoUrl} alt={programme.entrepriseName} className="w-32 h-32 rounded-2xl object-cover border-4 border-background shadow-xl" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-background shadow-xl flex items-center justify-center">
                  <Shield className="w-12 h-12 text-primary" />
                </div>
              )}
              {programme.status === "actif" && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-background shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <Link to="/programmes" className="hover:text-primary transition-colors">Programmes</Link>
                <ChevronRight className="w-3 h-3" />
                <span>{programme.sector}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">{programme.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 font-bold">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-foreground">{programme.entrepriseName}</span>
                </div>
                <div className="h-4 w-px bg-border hidden md:block" />
                <div className="flex items-center gap-1.5 font-bold">
                  <Wallet className="w-4 h-4 text-green-500" />
                  <span className="text-foreground">Prime : {programme.minReward.toLocaleString()} - {programme.maxReward.toLocaleString()} XAF</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-14 text-lg">
                <Link to={`/soumettre-rapport?programme=${programme.id}`}>
                  SOUMETTRE UN RAPPORT
                </Link>
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground uppercase">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" /> 4.8 Rating</span>
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> {(programme.programType || "public").toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Tabs */}
      <section className="py-8 relative">
        <div className="container px-4">
          <Tabs defaultValue="overview" className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-8">
                <TabsList className="bg-secondary/50 p-1 border border-border h-14 w-full md:w-auto overflow-x-auto justify-start md:justify-center">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold px-6 h-full gap-2">
                    <Info className="w-4 h-4" /> APERÇU
                  </TabsTrigger>
                  <TabsTrigger value="targets" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold px-6 h-full gap-2">
                    <Target className="w-4 h-4" /> PÉRIMÈTRE
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold px-6 h-full gap-2">
                    <Wallet className="w-4 h-4" /> RÉCOMPENSES
                  </TabsTrigger>
                  <TabsTrigger value="hall-of-fame" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold px-6 h-full gap-2">
                    <Trophy className="w-4 h-4" /> HALL OF FAME
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-0 border-none p-0 focus-visible:ring-0">
                  <Card className="glass-card border-glow border-none shadow-none bg-transparent">
                    <CardHeader className="px-0">
                      <CardTitle className="text-2xl font-black">Informations sur le programme</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 space-y-8">
                      <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
                        <p className="text-lg whitespace-pre-wrap">{programme.descriptionLong || programme.description}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-foreground">Méthodologie Attendue</h3>
                        <div className="grid gap-4">
                          {(programme.methodology || "Tests manuels privilégiés.\nPas de scans destructifs.\nTout PoC doit être reproductible.").split("\n").map((step, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">{i + 1}</div>
                              <p className="text-muted-foreground font-medium">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-foreground">Conditions & Divulgation</h3>
                        <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                          <p className="text-sm text-muted-foreground">
                            {programme.disclosurePolicy || "Ce programme suit une politique de divulgation coordonnée. Ne divulguez pas les vulnérabilités publiquement sans l'autorisation explicite de l'organisation."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="targets" className="space-y-8 mt-0 border-none p-0 focus-visible:ring-0">
                  <Card className="glass-card border-glow overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        Périmètre autorisé (In-Scope)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-secondary/10">
                          <TableRow>
                            <TableHead className="font-bold">Cible / Actif</TableHead>
                            <TableHead className="font-bold">Type</TableHead>
                            <TableHead className="font-bold">Prime</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {programme.scope.map((asset) => (
                            <TableRow key={asset} className="hover:bg-secondary/20">
                              <TableCell className="font-mono font-bold text-primary">{asset}</TableCell>
                              <TableCell><Badge variant="secondary" className="bg-secondary text-foreground">{programme.tags?.[0] || "Web"}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/5 font-bold">ÉLIGIBLE</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-glow border-destructive/20 overflow-hidden">
                    <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Hors périmètre (Out-of-Scope)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableBody>
                          {(programme.outOfScope || ["Tout ce qui n'est pas listé dans le scope", "Attaques DoS/DDoS", "Social Engineering"]).map((asset) => (
                            <TableRow key={asset} className="hover:bg-secondary/20">
                              <TableCell className="text-muted-foreground">{asset}</TableCell>
                              <TableCell className="text-right"><Badge variant="outline" className="border-destructive/20 text-destructive bg-destructive/5 font-bold uppercase text-[10px]">NON ÉLIGIBLE</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rewards" className="space-y-8 mt-0 border-none p-0 focus-visible:ring-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {programme.rewardTiers?.map((tier) => (
                      <Card key={tier.severity} className={`glass-card border-glow ${SEVERITY_COLORS[tier.severity]}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-black uppercase tracking-widest">{tier.severity}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-black text-foreground">{tier.max.toLocaleString()} <span className="text-xs">XAF</span></p>
                          <p className="text-[11px] text-muted-foreground mt-2 font-medium leading-tight">{tier.note}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="glass-card border-glow">
                    <CardHeader>
                      <CardTitle>Directives de Paiement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      <p>Les récompenses sont basées sur l'impact métier réel démontré par le chercheur. La sévérité finale est déterminée par l'équipe de sécurité de l'organisation après validation du PoC.</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Les vulnérabilités critiques impliquent une compromission totale du système.</li>
                        <li>Les doublons ne sont pas récompensés (Premier arrivé, premier servi).</li>
                        <li>Le paiement est effectué dans les 14 jours suivant la validation.</li>
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="hall-of-fame" className="space-y-8 mt-0 border-none p-0 focus-visible:ring-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="glass-card p-6 flex items-center gap-4 rounded-2xl border border-border hover:border-primary/40 transition-all">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center font-black text-lg border border-border">
                          {i === 1 ? "🥇" : i === 2 ? "🥈" : i === 3 ? "🥉" : i}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground">Hacker #{i}45</p>
                          <p className="text-xs text-muted-foreground">3 vulnérabilités validées</p>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">+{1500 / i} pts</Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>

              {/* Right Sidebar */}
              <div className="w-full lg:w-[320px] space-y-6">
                <Card className="glass-card border-glow rounded-2xl overflow-hidden">
                  <CardHeader className="bg-secondary/30 border-b border-border p-5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" /> STATISTIQUES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Triage</p>
                        <p className="text-lg font-black text-foreground">{programme.triageTimeHours || 24}h</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Premier Retour</p>
                        <p className="text-lg font-black text-foreground">{programme.firstResponseHours || 12}h</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Moyenne de paiement</p>
                      <p className="text-lg font-black text-primary">350,000 XAF</p>
                    </div>
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground">Acceptation</span>
                        <span className="text-foreground">94%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: "94%" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-glow rounded-2xl">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" /> INFORMATIONS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Site web</p>
                      <a href={programme.website} target="_blank" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                        {programme.website || "https://organisation.ga"} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Secteur</p>
                      <p className="text-xs text-foreground font-medium">{programme.sector || "Technologie"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lancé le</p>
                      <p className="text-xs text-foreground font-medium">{programme.createdAt}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-glow rounded-2xl overflow-hidden">
                  <CardHeader className="bg-secondary/30 border-b border-border p-5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" /> ACTIVITÉ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {programmeReports.length > 0 ? (
                      programmeReports.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex gap-3">
                          <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0">
                            <Bug className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground leading-tight line-clamp-1">{r.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{r.createdAt} par {r.hackerName}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucune activité récente.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </Tabs>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}

// Add missing imports
import { BarChart3, Bug } from "lucide-react";
