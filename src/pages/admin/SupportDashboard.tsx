import DashboardLayout from "@/components/DashboardLayout";
import { useHackers, useUpdateHacker } from "@/hooks/api/hackers";
import { useEntreprises, useUpdateEntreprise } from "@/hooks/api/entreprises";
import { apiErrorMessage } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  LifeBuoy,
  AlertCircle,
  Clock,
  Search,
  ChevronRight,
  ShieldQuestion,
  BarChart2,
  ShieldAlert,
  Building2,
  Ban,
  Eye,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

export default function SupportDashboard() {
  const pageTitle = useContent("admin.support.title", "Support Desk");
  const pageSubtitle = useContent("admin.support.subtitle", "Centre d'opérations : Tickets, Utilisateurs et Modération.");
  const tabTickets = useContent("admin.support.tabs.tickets", "File de Tickets");
  const tabUsers = useContent("admin.support.tabs.users", "Utilisateurs & KYC");
  const tabModeration = useContent("admin.support.tabs.moderation", "Modération");
  const ticketsHeading = useContent("admin.support.tickets-heading", "File Prioritaire");
  const moderationHeading = useContent("admin.support.moderation-heading", "Vigilance");
  const kbCardHeading = useContent("admin.support.kb-card.heading", "Base de Connaissances");
  const kbCardText = useContent("admin.support.kb-card.text", "Accédez aux protocoles de résolution et aux guides de médiation officiels.");
  const performanceHeading = useContent("admin.support.performance-heading", "Performance Support");
  const { data: hackers = [] } = useHackers();
  const { data: entreprises = [] } = useEntreprises();
  const updateHacker = useUpdateHacker();
  const updateEntreprise = useUpdateEntreprise();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"tickets" | "moderation" | "users">("tickets");
  
  // Mock Tickets for display
  const tickets = [
    { id: "TK-402", user: "Hacker_X", subject: "Appel sur rapport de vulnérabilité #902", category: "Litige Prime", status: "ouvert", priority: "critique", time: "12m" },
    { id: "TK-403", user: "SEEG Gabon", subject: "Instabilité de l'endpoint d'authentification", category: "Technique", status: "en_cours", priority: "haute", time: "45m" },
    { id: "TK-404", user: "Hacker_Y", subject: "Délai de versement Mobile Money Moov", category: "Finance", status: "résolu", priority: "moyenne", time: "2h" },
    { id: "TK-405", user: "BGFIBank", subject: "Mise à jour du périmètre de sécurité", category: "Programme", status: "ouvert", priority: "basse", time: "3h" },
  ];

  const [userSearch, setUserSearch] = useState("");
  const [kycFilter, setKycFilter] = useState(false);

  const filteredHackers = useMemo(() => hackers.filter(h => h.name.toLowerCase().includes(userSearch.toLowerCase()) || h.email.toLowerCase().includes(userSearch.toLowerCase())), [hackers, userSearch]);
  const filteredEntreprises = useMemo(() => entreprises.filter(e => e.name.toLowerCase().includes(userSearch.toLowerCase()) || e.email.toLowerCase().includes(userSearch.toLowerCase())), [entreprises, userSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
              <LifeBuoy className="w-8 h-8 text-blue-500" /> {pageTitle}
            </h1>
            <p className="text-muted-foreground font-medium">{pageSubtitle}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Système Opérationnel</span>
            </div>
            <div className="h-10 w-[1px] bg-border hidden md:block" />
            <Button className="h-12 px-6 bg-blue-600 text-white hover:bg-blue-700 font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 gap-2">
              <MessageSquare className="w-4 h-4" /> NOUVEAU TICKET
            </Button>
          </div>
        </div>

        {/* Tabs System */}
        <Tabs defaultValue="tickets" value={activeTab} onValueChange={(v) => setActiveTab(v as "tickets" | "moderation" | "users")} className="space-y-8">
          <TabsList className="bg-secondary/30 p-1 rounded-2xl border border-border h-14 w-full justify-start gap-2 overflow-x-auto">
            <TabsTrigger value="tickets" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white shrink-0">
              <MessageSquare className="w-4 h-4 mr-2" /> {tabTickets}
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white shrink-0">
              <Users className="w-4 h-4 mr-2" /> {tabUsers}
            </TabsTrigger>
            <TabsTrigger value="moderation" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white shrink-0">
              <ShieldAlert className="w-4 h-4 mr-2" /> {tabModeration}
            </TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="animate-in fade-in slide-in-from-bottom-4 duration-300 outline-none">
             <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    placeholder="Rechercher un ticket..." 
                    className="pl-12 h-14 bg-secondary/30 border-border rounded-[20px] font-bold" 
                  />
                </div>
              </div>

              <Card className="glass-card rounded-[32px] border-border overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> {ticketsHeading}</h3>
                   <Badge className="bg-blue-500/10 text-blue-500 border-none font-black">{tickets.length} TICKETS</Badge>
                </div>
                <div className="divide-y divide-border">
                  {tickets.map((tk) => (
                    <div 
                      key={tk.id} 
                      className="p-6 flex items-center justify-between hover:bg-secondary/40 transition-all group cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                      onClick={() => navigate(`/admin/support/ticket/${tk.id}`)}
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div className={`h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-lg ${
                          tk.priority === "critique" ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-500"
                        }`}>
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-black truncate group-hover:text-blue-500 transition-colors">{tk.subject}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{tk.id} • {tk.user}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className="text-[9px] font-black uppercase h-6 px-3 rounded-full bg-secondary text-foreground">{tk.status}</Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-300 outline-none">
            <div className="space-y-8">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    placeholder="Chercher un chercheur ou une entreprise..." 
                    className="pl-12 h-14 bg-secondary/30 border-border rounded-[20px] font-bold"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className={`rounded-xl h-14 border-border font-black text-[10px] uppercase ${kycFilter ? "bg-orange-500 text-white" : ""}`} onClick={() => setKycFilter(!kycFilter)}>
                   <ShieldCheck className="w-4 h-4 mr-2" /> KYC EN ATTENTE
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredHackers.map(h => (
                    <Card key={h.id} className="glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all group cursor-pointer" onClick={() => navigate(`/admin/utilisateurs/${h.id}`)}>
                       <div className="flex items-center justify-between mb-6">
                          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center font-black text-xl text-blue-500 border border-blue-500/20">
                            {h.name[0]}
                          </div>
                          <Badge className="bg-green-500/10 text-green-500 text-[8px] font-black uppercase">{h.status}</Badge>
                       </div>
                       <div className="mb-6">
                          <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{h.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">CHERCHEUR</p>
                       </div>
                       <div className="flex gap-2">
                          <Button className="flex-1 rounded-xl h-11 bg-secondary text-foreground group-hover:bg-blue-600 group-hover:text-white font-black text-[10px] uppercase transition-all">
                            <Eye className="w-4 h-4 mr-2" /> VOIR PROFIL
                          </Button>
                          <Button variant="outline" className="h-11 w-11 rounded-xl border-border text-destructive hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                            event.stopPropagation();
                            updateHacker.mutate({ id: h.id, data: { status: "suspendu" } }, {
                              onSuccess: () => toast.error("Utilisateur suspendu"),
                              onError: (err) => toast.error(apiErrorMessage(err)),
                            });
                          }}>
                            <Ban className="w-4 h-4" />
                          </Button>
                       </div>
                    </Card>
                 ))}
                 {filteredEntreprises.map(e => (
                    <Card key={e.id} className="glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all group cursor-pointer" onClick={() => navigate(`/admin/utilisateurs/${e.id}`)}>
                       <div className="flex items-center justify-between mb-6">
                          <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <Badge className="bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase">{e.status}</Badge>
                       </div>
                       <div className="mb-6">
                          <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{e.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">ENTREPRISE</p>
                       </div>
                       <div className="flex gap-2">
                          <Button className="flex-1 rounded-xl h-11 bg-secondary text-foreground group-hover:bg-blue-600 group-hover:text-white font-black text-[10px] uppercase transition-all">
                            <Eye className="w-4 h-4 mr-2" /> AUDIT CLIENT
                          </Button>
                          <Button variant="outline" className="h-11 w-11 rounded-xl border-border text-destructive hover:bg-destructive hover:text-white transition-all" onClick={(event) => {
                            event.stopPropagation();
                            updateEntreprise.mutate({ id: e.id, data: { status: "suspendu" } }, {
                              onSuccess: () => toast.error("Entreprise suspendue"),
                              onError: (err) => toast.error(apiErrorMessage(err)),
                            });
                          }}>
                            <Ban className="w-4 h-4" />
                          </Button>
                       </div>
                    </Card>
                 ))}
              </div>
            </div>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="animate-in fade-in slide-in-from-bottom-4 duration-300 outline-none">
            <Card className="glass-card p-8 rounded-[32px] border-border shadow-2xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Users className="w-6 h-6 text-blue-500" /> {moderationHeading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { user: "Hacker_Shadow", reason: "Brute force détecté", risk: "Critique" },
                  { user: "Cyber_G", reason: "Multi-comptes suspectés", risk: "Haut" },
                ].map((report, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-secondary/30 border border-border space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-sm font-black">{report.user}</p>
                       <Badge className="bg-destructive text-white text-[8px] font-black">{report.risk}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{report.reason}</p>
                    <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase border-border">ENQUÊTER</Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Support Tools Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="glass-card p-8 rounded-[32px] border-border space-y-6 shadow-2xl bg-gradient-to-br from-blue-600/10 to-transparent">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2"><ShieldQuestion className="w-4 h-4" /> {kbCardHeading}</h3>
              <p className="text-[11px] text-muted-foreground font-medium italic">{kbCardText}</p>
              <Button className="w-full h-12 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 uppercase text-[10px]" onClick={() => navigate("/admin/support/kb")}>CONSULTER LA KB</Button>
            </Card>

            <Card className="glass-card p-8 rounded-[32px] border-border space-y-6 shadow-2xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> {performanceHeading}</h3>
              <div className="flex justify-between items-end h-24 gap-1">
                 {[40, 70, 45, 90, 65, 80, 55].map((h, i) => <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-500/20 rounded-t-sm" />)}
              </div>
              <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase">
                 <span>Résolution</span>
                 <span className="text-blue-500">92%</span>
              </div>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
