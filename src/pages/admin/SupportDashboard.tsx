import DashboardLayout from "@/components/DashboardLayout";
import { useHackers, useUpdateHacker } from "@/hooks/api/hackers";
import { useEntreprises, useUpdateEntreprise } from "@/hooks/api/entreprises";
import { useTickets, useCreateTicket, type TicketPriority } from "@/hooks/api/tickets";
import { useFraudSignals } from "@/hooks/api/fraud";
import { useKycDocuments } from "@/hooks/api/kyc";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("moyenne");
  const [message, setMessage] = useState("");
  const createTicket = useCreateTicket();

  const reset = () => { setSubject(""); setCategory(""); setPriority("moyenne"); setMessage(""); };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 bg-blue-600 text-white hover:bg-blue-700 font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 gap-2">
          <MessageSquare className="w-4 h-4" /> NOUVEAU TICKET
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter">Nouveau ticket</DialogTitle>
          <DialogDescription>Ouvert au nom de votre compte support.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Technique, Finance..." className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border">
                  {(["critique", "haute", "moyenne", "basse"] as const).map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="bg-secondary/50 min-h-24" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={subject.trim().length < 3 || category.trim().length < 1 || message.trim().length < 1 || createTicket.isPending}
            onClick={() => {
              createTicket.mutate(
                { subject: subject.trim(), category: category.trim(), priority, message: message.trim() },
                {
                  onSuccess: () => { toast.success("Ticket créé"); setOpen(false); reset(); },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                },
              );
            }}
            className="bg-primary text-primary-foreground font-bold"
          >
            CRÉER
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const { data: tickets = [] } = useTickets();
  const { data: openSignals = [] } = useFraudSignals({ status: "open" });
  const [ticketSearch, setTicketSearch] = useState("");
  const filteredTickets = useMemo(
    () => tickets.filter((tk) => tk.subject.toLowerCase().includes(ticketSearch.toLowerCase()) || tk.author.name.toLowerCase().includes(ticketSearch.toLowerCase())),
    [tickets, ticketSearch],
  );

  const [userSearch, setUserSearch] = useState("");
  const [kycFilter, setKycFilter] = useState(false);
  const { data: pendingKycDocuments = [] } = useKycDocuments({ status: "en_attente" });
  const pendingKycSubjectIds = useMemo(() => new Set(pendingKycDocuments.map((d) => d.subjectId)), [pendingKycDocuments]);

  const filteredHackers = useMemo(
    () => hackers
      .filter(h => h.name.toLowerCase().includes(userSearch.toLowerCase()) || h.email.toLowerCase().includes(userSearch.toLowerCase()))
      .filter(h => !kycFilter || pendingKycSubjectIds.has(h.profileId)),
    [hackers, userSearch, kycFilter, pendingKycSubjectIds],
  );
  const filteredEntreprises = useMemo(
    () => entreprises
      .filter(e => e.name.toLowerCase().includes(userSearch.toLowerCase()) || e.email.toLowerCase().includes(userSearch.toLowerCase()))
      .filter(e => !kycFilter || pendingKycSubjectIds.has(e.profileId)),
    [entreprises, userSearch, kycFilter, pendingKycSubjectIds],
  );

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
            <NewTicketDialog />
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
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                  />
                </div>
              </div>

              <Card className="glass-card rounded-[32px] border-border overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> {ticketsHeading}</h3>
                   <Badge className="bg-blue-500/10 text-blue-500 border-none font-black">{filteredTickets.length} TICKETS</Badge>
                </div>
                <div className="divide-y divide-border">
                  {filteredTickets.map((tk) => (
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
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{tk.author.name}</p>
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
                {openSignals.map((signal) => (
                  <div key={signal.id} className="p-6 rounded-3xl bg-secondary/30 border border-border space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-sm font-black capitalize">{signal.type.replace(/_/g, " ")}</p>
                       <Badge className="bg-destructive text-white text-[8px] font-black capitalize">{signal.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{signal.summary}</p>
                    <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase border-border" onClick={() => navigate("/admin/fraude")}>ENQUÊTER</Button>
                  </div>
                ))}
                {openSignals.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucun signal de fraude ouvert.</p>
                )}
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
