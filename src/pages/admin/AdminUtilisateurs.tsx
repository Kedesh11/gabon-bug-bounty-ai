import DashboardLayout from "@/components/DashboardLayout";
import { useHackers, useUpdateHacker, useDeleteHacker } from "@/hooks/api/hackers";
import { useEntreprises, useUpdateEntreprise, useDeleteEntreprise } from "@/hooks/api/entreprises";
import { apiErrorMessage } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Ban,
  Search,
  ShieldCheck,
  FileText,
  User,
  Building2,
  Eye,
  Check,
  X
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContent } from "@/hooks/api/content";

export default function AdminUtilisateurs() {
  const pageTitle = useContent("admin.utilisateurs.title", "Gestion des Utilisateurs");
  const pageSubtitle = useContent("admin.utilisateurs.subtitle", "Administration, KYC et contrôle d'accès global.");
  const kycHeading = useContent("admin.utilisateurs.kyc-heading", "Validation d'Identité (KYC)");
  const { data: hackers = [] } = useHackers();
  const { data: entreprises = [] } = useEntreprises();
  const updateHacker = useUpdateHacker();
  const deleteHacker = useDeleteHacker();
  const updateEntreprise = useUpdateEntreprise();
  const deleteEntreprise = useDeleteEntreprise();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"hackers" | "entreprises" | "kyc">("hackers");
  const [search, setSearch] = useState("");

  const filteredHackers = useMemo(() => hackers.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.email.toLowerCase().includes(search.toLowerCase())), [hackers, search]);
  const filteredEntreprises = useMemo(() => entreprises.filter(entreprise => entreprise.name.toLowerCase().includes(search.toLowerCase()) || entreprise.email.toLowerCase().includes(search.toLowerCase())), [entreprises, search]);
  
  const kycRequests = useMemo(() => [
    { id: "kyc-1", user: "CyberPanther", userId: "hacker-1", type: "Passeport", status: "en_attente", date: "2024-07-20" },
    { id: "kyc-2", user: "Gh0stNet", userId: "hacker-2", type: "CNI Gabon", status: "en_attente", date: "2024-07-21" },
    { id: "kyc-3", user: "Hacker_Z", userId: "hacker-3", type: "Permis", status: "rejeté", date: "2024-07-19" },
  ], []);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              <User className="w-8 h-8 text-blue-500" /> {pageTitle}
            </h1>
            <p className="text-muted-foreground font-medium italic">{pageSubtitle}</p>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Rechercher un nom, email..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-12 h-12 bg-secondary/30 border-border rounded-2xl font-bold focus:ring-blue-500/20" 
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hackers" value={activeTab} onValueChange={(v) => setActiveTab(v as "hackers" | "entreprises" | "kyc")} className="space-y-8">
          <TabsList className="bg-secondary/30 p-1 rounded-2xl border border-border h-14 w-full justify-start gap-2">
            <TabsTrigger value="hackers" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" /> Chercheurs ({hackers.length})
            </TabsTrigger>
            <TabsTrigger value="entreprises" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" /> Entreprises ({entreprises.length})
            </TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <ShieldCheck className="w-4 h-4 mr-2" /> Demandes KYC 
              <Badge className="ml-2 bg-destructive/10 text-destructive border-none h-4 px-1 text-[8px]">2</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hackers" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHackers.map(h => (
                <Card key={h.id} className="glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all group relative overflow-hidden cursor-pointer" onClick={() => navigate(`/admin/utilisateurs/${h.id}`)}>
                   <div className="absolute top-0 right-0 p-4">
                      <Badge className={`text-[8px] font-black uppercase ${
                        h.status === "actif" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                      }`}>{h.status}</Badge>
                   </div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-xl text-blue-500 border border-border">
                        {h.name[0]}
                      </div>
                      <div>
                        <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{h.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{h.email}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mb-6 border-y border-border py-4">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reputation</p>
                        <p className="text-lg font-black text-foreground">{h.reputation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bugs Found</p>
                        <p className="text-lg font-black text-foreground">{h.bugsFound}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl h-10 text-[10px] font-black uppercase border-border group-hover:bg-blue-600 group-hover:text-white transition-all">VOIR DOSSIER</Button>
                      <Button variant="outline" className="h-10 w-10 rounded-xl border-border text-destructive hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                        event.stopPropagation();
                        updateHacker.mutate(
                          { id: h.id, data: { status: h.status === 'actif' ? 'suspendu' : 'actif' } },
                          { onSuccess: () => toast.info("Statut mis à jour"), onError: (err) => toast.error(apiErrorMessage(err)) },
                        );
                      }}>
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" className="h-10 w-10 rounded-xl border-border text-muted-foreground hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                        event.stopPropagation();
                        deleteHacker.mutate(h.id, { onSuccess: () => toast.error("Utilisateur supprimé"), onError: (err) => toast.error(apiErrorMessage(err)) });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="entreprises" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEntreprises.map(e => (
                <Card key={e.id} className="glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all group relative overflow-hidden cursor-pointer" onClick={() => navigate(`/admin/utilisateurs/${e.id}`)}>
                   <div className="absolute top-0 right-0 p-4">
                      <Badge className="bg-blue-500/10 text-blue-500 border-none text-[8px] font-black uppercase">{e.status}</Badge>
                   </div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-xl text-blue-500 border border-border">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{e.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{e.sector}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mb-6 border-y border-border py-4">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Programmes</p>
                        <p className="text-lg font-black text-foreground">{e.programmesCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Payé</p>
                        <p className="text-lg font-black text-foreground">{(e.totalPaid/1000000).toFixed(1)}M</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl h-10 text-[10px] font-black uppercase border-border group-hover:bg-blue-600 group-hover:text-white transition-all">AUDIT CLIENT</Button>
                      <Button variant="outline" className="h-10 w-10 rounded-xl border-border text-destructive hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                        event.stopPropagation();
                        updateEntreprise.mutate(
                          { id: e.id, data: { status: e.status === 'actif' ? 'suspendu' : 'actif' } },
                          { onSuccess: () => toast.info("Statut mis à jour"), onError: (err) => toast.error(apiErrorMessage(err)) },
                        );
                      }}>
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" className="h-10 w-10 rounded-xl border-border text-muted-foreground hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                        event.stopPropagation();
                        deleteEntreprise.mutate(e.id, { onSuccess: () => toast.error("Entreprise supprimée"), onError: (err) => toast.error(apiErrorMessage(err)) });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="glass-card rounded-[32px] border-border overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" /> {kycHeading}
                </h3>
                <Badge className="bg-orange-500/10 text-orange-500 border-none font-black text-[10px]">2 EN ATTENTE</Badge>
              </div>
              <div className="divide-y divide-border">
                {kycRequests.map((req) => (
                  <div key={req.id} className="p-6 flex items-center justify-between hover:bg-secondary/40 transition-all group border-l-4 border-l-transparent hover:border-l-blue-500 cursor-pointer" onClick={() => navigate(`/admin/utilisateurs/${req.userId}`)}>
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black">{req.user}</p>
                          <Badge variant="outline" className="text-[8px] font-black uppercase border-border">{req.type}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1 italic">Soumis le {req.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" className="rounded-xl h-10 text-[10px] font-black uppercase border-border gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all"><Eye className="w-4 h-4" /> ANALYSER DOSSIER</Button>
                      <div className="h-8 w-[1px] bg-border mx-2" />
                      <Button className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" onClick={(e) => { e.stopPropagation(); toast.success("KYC Approuvé"); }}><Check className="w-5 h-5" /></Button>
                      <Button className="h-10 w-10 rounded-xl bg-destructive hover:bg-destructive/110 text-white shadow-lg shadow-destructive/20" onClick={(e) => { e.stopPropagation(); toast.error("KYC Rejeté"); }}><X className="w-5 h-5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
