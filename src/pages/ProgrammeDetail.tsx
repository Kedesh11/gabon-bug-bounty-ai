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
} from "lucide-react";

import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEVERITY_ORDER: Array<"critique" | "haute" | "moyenne" | "faible"> = ["critique", "haute", "moyenne", "faible"];

const getSeverityLabel = (severity: "critique" | "haute" | "moyenne" | "faible") => {
  if (severity === "critique") return "Critique";
  if (severity === "haute") return "Haute";
  if (severity === "moyenne") return "Moyenne";
  return "Faible";
};

const statusLabel = (status: "actif" | "pause" | "fermé", isNew?: boolean) => {
  if (isNew) return "Nouveau";
  if (status === "actif") return "Actif";
  if (status === "pause") return "En pause";
  return "Fermé";
};

export default function ProgrammeDetail() {
  const { id } = useParams();
  const { programmes, reports } = useData();

  const programme = programmes.find((entry) => entry.id === id);

  if (!programme) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-16">
          <div className="container px-4 max-w-3xl text-center">
            <h1 className="text-3xl font-black text-foreground mb-3">Programme introuvable</h1>
            <p className="text-muted-foreground mb-6">Le programme demandé n'existe pas ou n'est plus disponible.</p>
            <Button asChild>
              <Link to="/programmes">Retour aux programmes</Link>
            </Button>
          </div>
        </section>
        <FooterSection />
      </div>
    );
  }

  const programmeReports = reports.filter((entry) => entry.programmeId === programme.id);

  const rewardTiers =
    programme.rewardTiers && programme.rewardTiers.length > 0
      ? [...programme.rewardTiers].sort(
          (left, right) => SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity),
        )
      : [
          {
            severity: "critique" as const,
            min: Math.max(programme.minReward, Math.round(programme.maxReward * 0.6)),
            max: programme.maxReward,
            note: "Impact critique confirmé",
          },
          {
            severity: "haute" as const,
            min: Math.max(programme.minReward, Math.round(programme.maxReward * 0.35)),
            max: Math.max(programme.minReward, Math.round(programme.maxReward * 0.59)),
            note: "Risque élevé exploitable",
          },
          {
            severity: "moyenne" as const,
            min: Math.max(programme.minReward, Math.round(programme.maxReward * 0.15)),
            max: Math.max(programme.minReward, Math.round(programme.maxReward * 0.34)),
            note: "Impact partiel sur le business",
          },
          {
            severity: "faible" as const,
            min: programme.minReward,
            max: Math.max(programme.minReward, Math.round(programme.maxReward * 0.14)),
            note: "Impact limité",
          },
        ];

  const terms = programme.terms && programme.terms.length > 0 ? programme.terms : [
    "Respecter le périmètre défini dans la section scope.",
    "Ne pas exfiltrer de données réelles.",
    "Fournir des preuves de concept reproductibles.",
    "Aucune attaque de déni de service n'est autorisée.",
  ];

  const outOfScope = programme.outOfScope && programme.outOfScope.length > 0 ? programme.outOfScope : [
    "Systèmes tiers non listés dans le scope.",
    "Attaques physiques ou ingénierie sociale.",
    "Spam, brute force massif, déni de service.",
  ];

  const methodology = programme.methodology
    ? programme.methodology.split("\n").map((entry) => entry.trim()).filter(Boolean)
    : [
        "Analyser l'authentification et la gestion de session.",
        "Tester les contrôles d'accès horizontal/vertical.",
        "Valider l'impact business avec PoC clair.",
      ];

  const communicationChannels =
    programme.communicationChannels && programme.communicationChannels.length > 0
      ? programme.communicationChannels
      : ["security@organisation.com", "Canal support triage"];

  const tags = programme.tags && programme.tags.length > 0 ? programme.tags : ["Web", "API"];
  const badgeClass = programme.status === "actif" ? "border-primary text-primary" : "border-yellow-500 text-yellow-400";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="container px-4 relative z-10 space-y-6">
          <div className="glass-card rounded-xl border-glow p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{programme.entrepriseName}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-foreground">{programme.name}</h1>
                <p className="text-muted-foreground max-w-4xl">{programme.descriptionLong || programme.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={badgeClass}>
                    {statusLabel(programme.status, programme.isNew)}
                  </Badge>
                  <Badge variant="outline" className="border-accent text-accent">
                    {(programme.programType || "public").toUpperCase()}
                  </Badge>
                  {programme.sector && (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {programme.sector}
                    </Badge>
                  )}
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-border text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-[220px] flex lg:justify-end">
                {programme.logoUrl ? (
                  <img src={programme.logoUrl} alt={programme.entrepriseName} className="w-24 h-24 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-border bg-secondary flex items-center justify-center">
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="glass-card border-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Récompenses</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-xl font-black text-primary">
                  {programme.minReward.toLocaleString()} - {programme.maxReward.toLocaleString()}
                </p>
                <p>{programme.rewardCurrency || "FCFA"}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Premier retour</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-xl font-black text-foreground">{programme.firstResponseHours || 24}h</p>
                <p className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> délai moyen</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Triage</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-xl font-black text-foreground">{programme.triageTimeHours || 48}h</p>
                <p className="inline-flex items-center gap-1"><FileSearch className="w-3 h-3" /> analyse initiale</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Résolution</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-xl font-black text-foreground">{programme.resolutionDays || 30} jours</p>
                <p>{programmeReports.length} rapports associés</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Scope autorisé</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {programme.scope.map((asset) => (
                    <div key={asset} className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                      <span className="font-mono text-sm text-foreground">{asset}</span>
                      <Badge variant="outline" className="border-primary/50 text-primary">in-scope</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Méthodologie attendue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {methodology.map((rule, index) => (
                    <div key={`${rule}-${index}`} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{rule}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Niveaux de récompense</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sévérité</TableHead>
                        <TableHead>Montant min</TableHead>
                        <TableHead>Montant max</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewardTiers.map((tier) => (
                        <TableRow key={tier.severity}>
                          <TableCell className="font-semibold">{getSeverityLabel(tier.severity)}</TableCell>
                          <TableCell>{tier.min.toLocaleString()} {programme.rewardCurrency || "FCFA"}</TableCell>
                          <TableCell>{tier.max.toLocaleString()} {programme.rewardCurrency || "FCFA"}</TableCell>
                          <TableCell className="text-muted-foreground">{tier.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Hors périmètre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {outOfScope.map((entry, index) => (
                    <div key={`${entry}-${index}`} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{entry}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Conditions & politiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Termes</p>
                    <ul className="space-y-1">
                      {terms.map((entry, index) => (
                        <li key={`${entry}-${index}`} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Politique de divulgation</p>
                    <p className="text-sm text-muted-foreground">
                      {programme.disclosurePolicy || "Divulgation coordonnée après validation du correctif."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Infos programme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Site web</p>
                      <p>{programme.website || "Non renseigné"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <ListChecks className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Canaux de communication</p>
                      <ul className="space-y-1 mt-1">
                        {communicationChannels.map((channel, index) => (
                          <li key={`${channel}-${index}`}>{channel}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Wallet className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Date de création</p>
                      <p>{programme.createdAt}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Activité récente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {programmeReports.length > 0 ? (
                    programmeReports.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border bg-secondary px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.hackerName} • {entry.createdAt}</p>
                        <p className="text-xs text-primary mt-1">{entry.status}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild className="w-full">
                    <Link to={`/hacker/rapports?programme=${programme.id}`}>
                      Soumettre un rapport
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/programmes">Retour à la liste</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
}
