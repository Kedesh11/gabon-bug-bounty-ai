import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import {
  Shield,
  Users,
  LayoutGrid,
  Table2,
  Search,
  ChevronRight,
  Zap,
  Building2,
  List,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FILTERS = ["Tous", "Web", "API", "Mobile", "Infrastructure", "Private", "VDP"] as const;

const severityColor = (maxReward: number) => {
  if (maxReward >= 5000000) return "text-destructive border-destructive/20 bg-destructive/10";
  if (maxReward >= 1000000) return "text-orange-500 border-orange-500/20 bg-orange-500/10";
  return "text-blue-500 border-blue-500/20 bg-blue-500/10";
};

const Programmes = () => {
  const { programmes } = useData();
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
                           (filterLower === "private" && p.programType === "private") ||
                           (filterLower === "vdp" && p.programType === "vdp") ||
                           (filterLower === "public" && p.programType === "public");
      return matchesSearch && matchesFilter;
    });
  }, [programmes, search, activeFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Search & Filter Header */}
      <section className="pt-32 pb-12 bg-secondary/20 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container px-4 relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Exploration des <span className="text-primary text-gradient-cyber">Cibles</span></h1>
              <p className="text-muted-foreground font-medium text-lg">Analysez les périmètres et sécurisez le cyber-espace gabonais.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Rechercher une entreprise, un actif..." 
                  className="pl-12 h-14 bg-background border-border text-lg shadow-2xl focus:ring-primary/20 rounded-2xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl border border-border">
                <button 
                  className={`p-3 rounded-xl transition-all ${viewMode === "card" ? "bg-background text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("card")}
                  title="Vue Grille"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                  className={`p-3 rounded-xl transition-all ${viewMode === "list" ? "bg-background text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("list")}
                  title="Vue Liste"
                >
                  <List className="w-5 h-5" />
                </button>
                <button 
                  className={`p-3 rounded-xl transition-all ${viewMode === "table" ? "bg-background text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("table")}
                  title="Vue Tableau"
                >
                  <Table2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {FILTERS.map((f) => (
                <Badge 
                  key={f} 
                  variant={activeFilter === f ? "default" : "outline"}
                  className={`px-5 py-2 cursor-pointer transition-all rounded-full font-bold ${activeFilter === f ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-background/50 hover:border-primary/50"}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Program List Section */}
      <section className="py-16 min-h-[600px]">
        <div className="container px-4">
          
          {/* Card View (Grid) */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {filteredProgrammes.map((p) => (
                <Link key={p.id} to={`/programmes/${p.id}`} className="group">
                  <Card className="h-full glass-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]">
                    <div className="p-6 bg-secondary/20 border-b border-border flex justify-between items-start">
                      <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center overflow-hidden p-2 group-hover:scale-110 transition-transform">
                        {p.logoUrl ? <img src={p.logoUrl} className="object-contain" /> : <Shield className="w-6 h-6 text-primary/40" />}
                      </div>
                      <Badge variant="outline" className={`font-black ${severityColor(p.maxReward)}`}>
                        {p.maxReward.toLocaleString()} XAF
                      </Badge>
                    </div>
                    <div className="p-6 flex-1 space-y-4">
                      <div>
                        <h3 className="text-xl font-black group-hover:text-primary transition-colors">{p.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mt-1 uppercase tracking-widest">
                          <Building2 className="w-3 h-3" /> {p.entrepriseName}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {p.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-[10px] uppercase font-bold">{t}</Badge>)}
                        {p.isNew && <Badge className="bg-accent text-accent-foreground text-[10px]">NOUVEAU</Badge>}
                      </div>
                    </div>
                    <div className="p-6 border-t border-border bg-secondary/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {p.reportsCount || 0} Hackers
                      </div>
                      <div className="flex items-center gap-1.5 text-primary">
                        Détails <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* List View (Horizontal) */}
          {viewMode === "list" && (
            <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
              {filteredProgrammes.map((p) => (
                <Link key={p.id} to={`/programmes/${p.id}`} className="group">
                  <Card className="glass-card border-border hover:border-primary/40 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-48 bg-secondary/30 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-border group-hover:bg-primary/5 transition-colors shrink-0">
                        {p.logoUrl ? <img src={p.logoUrl} className="w-20 h-20 object-contain" /> : <Shield className="w-10 h-10 text-primary/40" />}
                      </div>
                      <div className="flex-1 p-6 md:p-8 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                              {p.isNew && <Badge className="bg-accent text-accent-foreground text-[10px]">NOUVEAU</Badge>}
                            </div>
                            <p className="text-sm font-bold text-muted-foreground mt-1 tracking-widest uppercase">{p.entrepriseName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prime Max</p>
                            <p className="text-2xl font-black text-foreground">{p.maxReward.toLocaleString()} <span className="text-sm font-normal">XAF</span></p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs font-bold">{p.triageTimeHours || 24}h Triage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold">{p.reportsCount || 0} Hackers</span>
                          </div>
                          <Badge variant="outline" className={`font-bold ${severityColor(p.maxReward)}`}>
                            {p.maxReward >= 5000000 ? "CRITIQUE" : "HAUTE"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="max-w-7xl mx-auto glass-card rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[300px] font-black uppercase text-[10px] tracking-widest">Programme</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Sévérité</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Prime Max</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProgrammes.map((p) => (
                    <TableRow key={p.id} className="hover:bg-primary/5 border-border group cursor-pointer" onClick={() => navigate(`/programmes/${p.id}`)}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center overflow-hidden p-1">
                            {p.logoUrl ? <img src={p.logoUrl} className="object-contain" /> : <Shield className="w-4 h-4 text-primary/30" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black">{p.entrepriseName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {p.tags?.map(t => <Badge key={t} variant="secondary" className="text-[9px] font-bold uppercase">{t}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-black ${severityColor(p.maxReward)}`}>
                          {p.maxReward >= 5000000 ? "CRITIQUE" : "HAUTE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-sm">
                        {p.maxReward.toLocaleString()} XAF
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/programmes/${p.id}`}><ChevronRight className="w-4 h-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredProgrammes.length === 0 && (
            <div className="text-center py-24 glass-card border-dashed">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-xl font-bold text-muted-foreground">Aucun programme ne correspond à votre recherche</p>
              <Button variant="link" onClick={() => { setSearch(""); setActiveFilter("Tous"); }}>
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
