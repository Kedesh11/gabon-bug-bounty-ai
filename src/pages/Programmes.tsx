import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Shield, ExternalLink, DollarSign, Users, AlertTriangle, Globe, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Programme } from "@/stores/dataStore";

const FILTERS = ["Tous", "Actif", "Nouveau", "Critique", "Web", "API"] as const;
type ViewMode = "cards" | "tableau";

const severityLabel = (programme: Programme) => {
  if (programme.rewardTiers?.some((tier) => tier.severity === "critique")) return "Critique";
  if (programme.maxReward >= 2500000) return "Critique";
  if (programme.maxReward >= 900000) return "Haute";
  if (programme.maxReward >= 250000) return "Moyenne";
  return "Faible";
};

const inferTags = (programme: Programme) => {
  if (programme.tags && programme.tags.length > 0) return programme.tags;

  const tags = new Set<string>();
  const joinedScope = programme.scope.join(" ").toLowerCase();
  if (joinedScope.includes("api")) tags.add("API");
  if (joinedScope.includes("app") || joinedScope.includes("web")) tags.add("Web");
  if (joinedScope.includes("mobile")) tags.add("Mobile");
  if (tags.size === 0) tags.add("Web");
  return Array.from(tags);
};

const statusLabel = (programme: Programme) => {
  if (programme.isNew) return "Nouveau";
  if (programme.status === "actif") return "Actif";
  if (programme.status === "pause") return "Pause";
  return "Fermé";
};

const Programmes = () => {
  const { programmes } = useData();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage, setCardsPerPage] = useState(12);

  useEffect(() => {
    const updateCardsPerPage = () => {
      const width = window.innerWidth;
      const columns = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
      setCardsPerPage(columns * 4);
    };

    updateCardsPerPage();
    window.addEventListener("resize", updateCardsPerPage);
    return () => window.removeEventListener("resize", updateCardsPerPage);
  }, []);

  const normalizedProgrammes = useMemo(() => {
    return programmes.map((programme) => ({
      id: programme.id,
      name: programme.name,
      scope: programme.scope.join(", "),
      rewards: `${programme.minReward.toLocaleString()} – ${programme.maxReward.toLocaleString()} ${programme.rewardCurrency || "FCFA"}`,
      severity: severityLabel(programme),
      hunters: Math.max(6, programme.reportsCount * 3),
      reports: programme.reportsCount,
      status: statusLabel(programme),
      tags: inferTags(programme),
      rawStatus: programme.status,
      isNew: !!programme.isNew,
    }));
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    if (activeFilter === "Tous") return normalizedProgrammes;

    return normalizedProgrammes.filter((programme) => {
      if (activeFilter === "Actif") {
        return programme.rawStatus === "actif";
      }
      if (activeFilter === "Nouveau") {
        return programme.isNew;
      }
      if (activeFilter === "Critique") {
        return programme.severity === "Critique";
      }
      return programme.tags.includes(activeFilter);
    });
  }, [activeFilter, normalizedProgrammes]);

  const pageSize = viewMode === "cards" ? cardsPerPage : 5;
  const totalPages = Math.max(1, Math.ceil(filteredProgrammes.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, viewMode, cardsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProgrammes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProgrammes.slice(start, start + pageSize);
  }, [currentPage, filteredProgrammes, pageSize]);

  const fromIndex = filteredProgrammes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, filteredProgrammes.length);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="container px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Explorer</span>
            <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
              <span className="text-foreground">Programmes </span>
              <span className="text-gradient-cyber">Bug Bounty</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez les organisations qui ont ouvert leurs systèmes aux hackers éthiques.
              Choisissez un programme et commencez à chasser.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-8">
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter((previous) => (previous === filter ? "Tous" : filter))}
                  className={`px-4 py-2 rounded-full text-sm font-mono transition-all ${
                    activeFilter === filter
                      ? "bg-primary/15 border border-primary text-primary cyber-glow"
                      : "glass-card border-glow text-muted-foreground hover:text-primary hover:border-primary/40"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all inline-flex items-center gap-2 ${
                  viewMode === "cards"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                Cards
              </button>
              <button
                onClick={() => setViewMode("tableau")}
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all inline-flex items-center gap-2 ${
                  viewMode === "tableau"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table2 className="w-3 h-3" />
                Tableau
              </button>
            </div>
          </div>

          {filteredProgrammes.length > 0 ? (
            <>
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedProgrammes.map((prog, i) => (
                    <Card key={`${prog.name}-${i}`} className="glass-card border-glow hover:cyber-glow transition-all duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <Badge variant="outline" className={`font-mono text-xs ${prog.status === "Nouveau" ? "border-accent text-accent" : "border-primary text-primary"}`}>
                            {prog.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl leading-tight">{prog.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="truncate">{prog.scope}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span>{prog.rewards}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <span>Sévérité max: {prog.severity}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4 text-accent" />
                            <span>{prog.hunters} hackers inscrits</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {prog.tags.map((tag) => (
                            <span key={tag} className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button asChild size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">
                          <Link to={`/programmes/${prog.id}`}>
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Voir le programme
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="glass-card border-glow rounded-xl p-2 md:p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Programme</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Récompenses</TableHead>
                        <TableHead>Sévérité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProgrammes.map((prog, i) => (
                        <TableRow key={`${prog.name}-${i}`}>
                          <TableCell className="font-semibold text-foreground">{prog.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{prog.scope}</TableCell>
                          <TableCell>{prog.rewards}</TableCell>
                          <TableCell>{prog.severity}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-mono text-xs ${prog.status === "Nouveau" ? "border-accent text-accent" : "border-primary text-primary"}`}>
                              {prog.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {prog.tags.map((tag) => (
                                <span key={tag} className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/programmes/${prog.id}`}>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Voir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground font-mono">
                  Affichage {fromIndex}-{toIndex} sur {filteredProgrammes.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                  >
                    Précédent
                  </Button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      className={currentPage === page ? "bg-primary text-primary-foreground" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card border-glow rounded-xl p-10 text-center">
              <p className="text-muted-foreground">Aucun programme ne correspond aux filtres sélectionnés.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveFilter("Tous")}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default Programmes;
