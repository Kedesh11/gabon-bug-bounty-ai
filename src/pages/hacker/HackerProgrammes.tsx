import DashboardLayout from "@/components/DashboardLayout";
import { useProgrammes } from "@/hooks/api/programmes";
import {
  Shield,
  Search,
  LayoutGrid,
  List,
  Table2,
  Building2,
  ArrowUpRight,
  Users,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useContent, useJsonContent } from "@/hooks/api/content";

const DEFAULT_FILTERS = ["Tous", "Web", "API", "Mobile", "Infrastructure", "Public", "Privé", "VDP"];

const severityColor = (maxReward: number) => {
  if (maxReward >= 5000000) return "text-destructive border-destructive/20 bg-destructive/10";
  if (maxReward >= 1000000) return "text-orange-500 border-orange-500/20 bg-orange-500/10";
  return "text-blue-500 border-blue-500/20 bg-blue-500/10";
};

export default function HackerProgrammes() {
  const pageTitle = useContent("hacker.programmes.title", "Exploration des Cibles");
  const pageSubtitle = useContent("hacker.programmes.subtitle", "Découvrez de nouveaux programmes et commencez vos recherches.");
  const FILTERS = useJsonContent<string[]>("hacker.programmes.filters", DEFAULT_FILTERS);
  const emptyStateText = useContent("hacker.programmes.empty-state", "Aucun programme trouvé");
  const { data: programmes = [] } = useProgrammes();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list" | "table">("card");

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.entrepriseName.toLowerCase().includes(search.toLowerCase());
      const filterLower = activeFilter.toLowerCase();
      const matchesFilter = activeFilter === "Tous" || 
                           p.tags?.some(t => t.toLowerCase() === filterLower) || 
                           (filterLower === "privé" && p.programType === "private") ||
                           (filterLower === "public" && p.programType === "public") ||
                           (filterLower === "vdp" && p.programType === "vdp");
      return matchesSearch && matchesFilter;
    });
  }, [programmes, search, activeFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tighter">{pageTitle}</h1>
            <p className="text-muted-foreground font-medium">{pageSubtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Rechercher une cible..." 
                className="pl-10 h-11 bg-secondary/50 border-border font-bold w-[300px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl border border-border h-11">
              <Button 
                variant={viewMode === "card" ? "secondary" : "ghost"} 
                size="icon" 
                className={`h-9 w-9 rounded-lg ${viewMode === "card" ? "bg-background shadow-sm" : ""}`}
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="icon" 
                className={`h-9 w-9 rounded-lg ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === "table" ? "secondary" : "ghost"} 
                size="icon" 
                className={`h-9 w-9 rounded-lg ${viewMode === "table" ? "bg-background shadow-sm" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Badge 
              key={f} 
              variant={activeFilter === f ? "default" : "outline"}
              className={`px-4 py-1.5 cursor-pointer transition-all rounded-lg font-bold border-border ${
                activeFilter === f ? "bg-primary text-primary-foreground" : "bg-background hover:border-primary/50"
              }`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>

        {/* List Content */}
        {viewMode === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgrammes.map((p) => (
              <Link key={p.id} to={`/programmes/${p.slug}`} className="group">
                <Card className="h-full glass-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="p-6 bg-secondary/20 border-b border-border flex justify-between items-start">
                    <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden p-2 group-hover:scale-110 transition-transform">
                      {p.logoUrl ? <img src={p.logoUrl} className="object-contain" /> : <Shield className="w-6 h-6 text-primary/40" />}
                    </div>
                    <Badge variant="outline" className={`font-black ${severityColor(p.maxReward)}`}>
                      {p.maxReward.toLocaleString()} XAF
                    </Badge>
                  </div>
                  <div className="p-6 flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-black group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mt-1 uppercase tracking-widest">
                        <Building2 className="w-3 h-3" /> {p.entrepriseName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {p.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-[9px] uppercase font-bold bg-secondary/50">{t}</Badge>)}
                      {p.isNew && <Badge className="bg-accent text-accent-foreground text-[9px]">NOUVEAU</Badge>}
                    </div>
                  </div>
                  <div className="p-4 border-t border-border bg-secondary/10 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {p.reportsCount || 0} Chercheurs
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      Rejoindre <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {viewMode === "list" && (
          <div className="space-y-4">
            {filteredProgrammes.map((p) => (
              <Link key={p.id} to={`/programmes/${p.slug}`} className="group block">
                <Card className="glass-card border-border hover:border-primary/40 transition-all overflow-hidden flex items-center">
                  <div className="w-32 bg-secondary/30 flex items-center justify-center p-6 border-r border-border h-full group-hover:bg-primary/5 transition-colors shrink-0 self-stretch">
                    {p.logoUrl ? <img src={p.logoUrl} className="w-12 h-12 object-contain" /> : <Shield className="w-8 h-8 text-primary/40" />}
                  </div>
                  <div className="flex-1 p-5 flex items-center justify-between gap-6">
                    <div>
                      <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.entrepriseName}</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="hidden sm:flex flex-col items-center">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Triage</p>
                        <p className="text-xs font-bold">{p.triageTimeHours || 24}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Prime Max</p>
                        <p className="text-sm font-black text-foreground">{p.maxReward.toLocaleString()} XAF</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-all" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {viewMode === "table" && (
          <div className="glass-card rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Programme</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Tags</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Récompense Max</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProgrammes.map((p) => (
                  <TableRow key={p.id} className="hover:bg-primary/5 border-border group cursor-pointer" onClick={() => navigate(`/programmes/${p.slug}`)}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center overflow-hidden p-1">
                          {p.logoUrl ? <img src={p.logoUrl} className="object-contain" /> : <Shield className="w-4 h-4 text-primary/30" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-black">{p.entrepriseName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-[8px] font-bold uppercase bg-secondary/50">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-sm">
                      {p.maxReward.toLocaleString()} XAF
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredProgrammes.length === 0 && (
          <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-bold text-muted-foreground">{emptyStateText}</p>
            <Button variant="link" className="text-primary mt-2" onClick={() => { setSearch(""); setActiveFilter("Tous"); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
