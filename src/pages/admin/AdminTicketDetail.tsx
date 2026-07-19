import DashboardLayout from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  MessageSquare,
  Flag,
  Send,
  Paperclip,
  Smile,
  CheckCircle,
  Trash2,
  User,
  ShieldQuestion,
  LifeBuoy,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";

interface Ticket {
  id: string;
  user: string;
  subject: string;
  category: string;
  status: "ouvert" | "en_cours" | "résolu";
  priority: "critique" | "haute" | "moyenne" | "basse";
  time: string;
  messages: { sender: "user" | "support"; text: string; time: string }[];
}

export default function AdminTicketDetail() {
  const caseDetailsHeading = useContent("admin.ticket-detail.case-details-heading", "Détails du Cas");
  const userContextHeading = useContent("admin.ticket-detail.user-context-heading", "Contexte Utilisateur");
  const kbHeading = useContent("admin.ticket-detail.kb-heading", "Base de Connaissances");
  const { id } = useParams();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState("");

  // In a real app, we'd fetch this from the store/API using the ID
  const [ticket, setTicket] = useState<Ticket>({ 
    id: id || "TK-402", 
    user: "Hacker_X", 
    subject: "Appel sur rapport de vulnérabilité #902", 
    category: "Litige Prime", 
    status: "ouvert", 
    priority: "critique", 
    time: "12m",
    messages: [
      { sender: "user", text: "Je ne suis pas d'accord avec la décision de tri. C'est bien une RCE. J'ai fourni un PoC fonctionnel qui permet l'exécution de code à distance via l'injection de paramètres non filtrés.", time: "12m" },
      { sender: "support", text: "Bonjour Hacker_X. Nous avons bien reçu votre demande de médiation. Notre équipe technique est en train de ré-analyser le PoC fourni.", time: "5m" }
    ]
  });

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const newMessage = { sender: "support" as const, text: replyText, time: "À l'instant" };
    setTicket(prev => ({ ...prev, messages: [...prev.messages, newMessage], status: "en_cours" }));
    setReplyText("");
    toast.success("Réponse envoyée");
  };

  const handleResolve = () => {
    setTicket(prev => ({ ...prev, status: "résolu" }));
    toast.success("Ticket marqué comme résolu");
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
           <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour au support
          </button>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-[10px] font-black uppercase"><Flag className="w-4 h-4 mr-2" /> SIGNALER</Button>
             <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-[10px] font-black uppercase text-destructive"><Trash2 className="w-4 h-4 mr-2" /> SUPPRIMER</Button>
          </div>
        </div>

        {/* Main Conversation Container */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
           {/* Chat Section */}
           <Card className="flex-1 glass-card rounded-[40px] border-border shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                       <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                       <h1 className="text-xl font-black tracking-tight">{ticket.subject}</h1>
                       <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{ticket.id} • {ticket.category}</p>
                    </div>
                 </div>
                 <Badge className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                    ticket.status === 'ouvert' ? 'bg-destructive/10 text-destructive' :
                    ticket.status === 'en_cours' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                 }`}>{ticket.status}</Badge>
              </div>

              <ScrollArea className="flex-1 p-8">
                 <div className="space-y-8 max-w-4xl mx-auto">
                    {ticket.messages.map((msg, i) => (
                       <div key={i} className={`flex ${msg.sender === 'support' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-4 max-w-[85%] ${msg.sender === 'support' ? 'flex-row-reverse' : 'flex-row'}`}>
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                msg.sender === 'support' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-secondary border-border text-foreground'
                             }`}>
                                {msg.sender === 'support' ? <LifeBuoy className="w-5 h-5" /> : <User className="w-5 h-5" />}
                             </div>
                             <div className={`space-y-2 ${msg.sender === 'support' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-6 rounded-[32px] shadow-lg ${
                                   msg.sender === 'support' 
                                      ? "bg-blue-600 text-white rounded-tr-none" 
                                      : "bg-secondary/40 border border-border rounded-tl-none"
                                }`}>
                                   <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2">
                                   {msg.sender === 'support' ? 'Support Tech' : ticket.user} • {msg.time}
                                </p>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </ScrollArea>

              <div className="p-6 border-t border-border bg-secondary/20">
                 <div className="max-w-4xl mx-auto space-y-4">
                    <div className="relative group">
                       <textarea 
                          className="w-full h-24 bg-background border border-border rounded-[28px] p-5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none outline-none"
                          placeholder="Écrivez votre réponse professionnelle..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendReply())}
                       />
                       <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-secondary"><Smile className="w-5 h-5 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-secondary"><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
                          <Button 
                             className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-600/30 gap-2 text-[10px] uppercase"
                             onClick={handleSendReply}
                          >
                             <Send className="w-3 h-3" /> RÉPONDRE
                          </Button>
                       </div>
                    </div>
                 </div>
              </div>
           </Card>

           {/* Info Sidebar Section */}
           <div className="w-full lg:w-[350px] space-y-6 shrink-0">
              <Card className="glass-card p-6 rounded-[32px] border-border space-y-6">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">{caseDetailsHeading}</h3>
                 <div className="space-y-4">
                    <InfoRow label="Priorité" value={ticket.priority.toUpperCase()} color={ticket.priority === 'critique' ? 'text-destructive' : 'text-blue-500'} />
                    <InfoRow label="Initié" value="Aujourd'hui, 12:45" />
                    <InfoRow label="Délai de réponse" value="< 1h" />
                    <InfoRow label="Assigné à" value="Support_Gabon_01" />
                 </div>
                 <Button className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20" onClick={handleResolve}>
                    <CheckCircle className="w-4 h-4 mr-2" /> RÉSOUDRE LE TICKET
                 </Button>
              </Card>

              <Card className="glass-card p-6 rounded-[32px] border-border space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">{userContextHeading}</h3>
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-black">
                       {ticket.user[0]}
                    </div>
                    <div>
                       <p className="text-sm font-black">{ticket.user}</p>
                       <p className="text-[10px] text-muted-foreground font-medium">Rep: 1,450 pts</p>
                    </div>
                    <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={() => navigate(`/admin/utilisateurs/${ticket.user}`)}>
                       <ChevronRight className="w-4 h-4" />
                    </Button>
                 </div>
              </Card>

              <div className="p-6 rounded-[32px] bg-blue-600/5 border border-blue-600/20 space-y-4">
                 <div className="flex items-center gap-2">
                    <ShieldQuestion className="w-5 h-5 text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">{kbHeading}</h4>
                 </div>
                 <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">
                    "Litige Prime : Toujours vérifier si le PoC a été testé sur le bon environnement avant de trancher."
                 </p>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value, color }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
       <span className={`text-[10px] font-bold ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );
}
