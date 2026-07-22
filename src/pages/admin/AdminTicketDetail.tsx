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
  LifeBuoy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { useContent } from "@/hooks/api/content";
import { useTicket, useAddTicketMessage, useUpdateTicketStatus, useDeleteTicket } from "@/hooks/api/tickets";
import { apiErrorMessage } from "@/lib/apiClient";

export default function AdminTicketDetail() {
  const caseDetailsHeading = useContent("admin.ticket-detail.case-details-heading", "Détails du Cas");
  const userContextHeading = useContent("admin.ticket-detail.user-context-heading", "Contexte Utilisateur");
  const kbHeading = useContent("admin.ticket-detail.kb-heading", "Base de Connaissances");
  const kbTip = useContent("admin.ticket-detail.kb-tip", "Consultez la base de connaissances pour les protocoles de résolution par catégorie.");
  const { id } = useParams();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState("");

  const { data: ticket, isLoading } = useTicket(id);
  const addMessage = useAddTicketMessage();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();

  const handleSendReply = () => {
    if (!replyText.trim() || !ticket) return;
    addMessage.mutate(
      { id: ticket.id, text: replyText.trim() },
      {
        onSuccess: () => { setReplyText(""); toast.success("Réponse envoyée"); },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const handleResolve = () => {
    if (!ticket) return;
    updateStatus.mutate(
      { id: ticket.id, status: "resolu" },
      {
        onSuccess: () => toast.success("Ticket marqué comme résolu"),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const handleDelete = () => {
    if (!ticket) return;
    deleteTicket.mutate(ticket.id, {
      onSuccess: () => { toast.success("Ticket supprimé"); navigate("/admin/support"); },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground p-8">Chargement…</p>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <h2 className="text-2xl font-black">Ticket introuvable</h2>
          <Button onClick={() => navigate("/admin/support")}>Retour au support</Button>
        </div>
      </DashboardLayout>
    );
  }

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
             <Button variant="outline" size="sm" className="h-9 rounded-xl border-border text-[10px] font-black uppercase text-destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> SUPPRIMER</Button>
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
                       <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{ticket.category}</p>
                    </div>
                 </div>
                 <Badge className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                    ticket.status === 'ouvert' ? 'bg-destructive/10 text-destructive' :
                    ticket.status === 'en_cours' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                 }`}>{ticket.status}</Badge>
              </div>

              <ScrollArea className="flex-1 p-8">
                 <div className="space-y-8 max-w-4xl mx-auto">
                    {ticket.messages.map((msg) => {
                      const isSupport = msg.authorId !== ticket.authorId;
                      return (
                       <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-4 max-w-[85%] ${isSupport ? 'flex-row-reverse' : 'flex-row'}`}>
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isSupport ? 'bg-blue-600 border-blue-500 text-white' : 'bg-secondary border-border text-foreground'
                             }`}>
                                {isSupport ? <LifeBuoy className="w-5 h-5" /> : <User className="w-5 h-5" />}
                             </div>
                             <div className={`space-y-2 ${isSupport ? 'items-end' : 'items-start'}`}>
                                <div className={`p-6 rounded-[32px] shadow-lg ${
                                   isSupport
                                      ? "bg-blue-600 text-white rounded-tr-none"
                                      : "bg-secondary/40 border border-border rounded-tl-none"
                                }`}>
                                   <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2">
                                   {msg.author.name} • {new Date(msg.createdAt).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                </p>
                             </div>
                          </div>
                       </div>
                      );
                    })}
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
                             disabled={addMessage.isPending}
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
                    <InfoRow label="Initié" value={new Date(ticket.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} />
                 </div>
                 {ticket.status !== "resolu" && (
                   <Button className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20" onClick={handleResolve} disabled={updateStatus.isPending}>
                      <CheckCircle className="w-4 h-4 mr-2" /> RÉSOUDRE LE TICKET
                   </Button>
                 )}
              </Card>

              <Card className="glass-card p-6 rounded-[32px] border-border space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">{userContextHeading}</h3>
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-black">
                       {ticket.author.name[0]}
                    </div>
                    <div className="min-w-0">
                       <p className="text-sm font-black truncate">{ticket.author.name}</p>
                       <p className="text-[10px] text-muted-foreground font-medium truncate">{ticket.author.email}</p>
                    </div>
                 </div>
              </Card>

              <div className="p-6 rounded-[32px] bg-blue-600/5 border border-blue-600/20 space-y-4">
                 <div className="flex items-center gap-2">
                    <ShieldQuestion className="w-5 h-5 text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">{kbHeading}</h4>
                 </div>
                 <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">
                    {kbTip}
                 </p>
                 <Button
                    variant="link"
                    className="h-auto p-0 text-blue-500 text-[10px] font-black uppercase"
                    onClick={() => navigate("/admin/support/kb")}
                 >
                    Consulter la base de connaissances
                 </Button>
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
