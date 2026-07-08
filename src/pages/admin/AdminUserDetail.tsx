import DashboardLayout from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  History,
  DollarSign,
  FileText,
  Ban,
  Trash2,
  ChevronLeft,
  Calendar,
  Globe,
  Award,
  Zap,
  Info,
  MessageSquare,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hackers, entreprises, logs, updateHacker, updateEntreprise } = useData();

  const hacker = hackers.find(h => h.id === id);
  const entreprise = entreprises.find(e => e.id === id);
  const userData = hacker || entreprise;

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black">Utilisateur Introuvable</h2>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isHacker = !!hacker;

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        {/* Top Navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Retour à la liste
        </button>

        {/* User Header Card */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
           <Card className="w-full xl:w-[400px] glass-card p-8 rounded-[40px] border-border shadow-2xl space-y-8 shrink-0">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="relative">
                    <div className="h-32 w-32 rounded-[48px] bg-blue-600/10 flex items-center justify-center font-black text-5xl text-blue-600 border border-blue-600/20 shadow-inner">
                       {userData.name[0]}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-2xl p-2 border-4 border-background">
                       <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                 </div>
                 <div>
                    <h1 className="text-3xl font-black tracking-tighter">{userData.name}</h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                       {isHacker ? "Chercheur Élite" : "Partenaire Entreprise"}
                    </p>
                 </div>
                 <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-blue-600/10 text-blue-600 border-none px-3 py-1 text-[10px] font-black uppercase">KYC VÉRIFIÉ</Badge>
                    <Badge className={`px-3 py-1 text-[10px] font-black uppercase ${
                       userData.status === 'actif' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                    }`}>{userData.status}</Badge>
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                 <DetailItem icon={<Mail className="w-4 h-4" />} label="Email" value={userData.email} />
                 <DetailItem icon={<Calendar className="w-4 h-4" />} label="Membre depuis" value="Janvier 2024" />
                 <DetailItem icon={<Globe className="w-4 h-4" />} label="Pays" value="Gabon" />
                 <DetailItem icon={<Award className="w-4 h-4" />} label="ID Unique" value={userData.id} />
              </div>

              <div className="pt-6 space-y-3">
                 <Button className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20">
                    <MessageSquare className="w-4 h-4 mr-2" /> ENVOYER UN MESSAGE
                 </Button>
                 <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-2xl border-border font-black text-[10px] uppercase" onClick={() => {
                       if(isHacker) updateHacker(userData.id, { status: userData.status === 'actif' ? 'suspendu' : 'actif' });
                       else updateEntreprise(userData.id, { status: userData.status === 'actif' ? 'suspendu' : 'actif' });
                       toast.success("Statut mis à jour");
                    }}>
                       <Ban className="w-4 h-4 mr-2" /> {userData.status === 'actif' ? 'SUSPENDRE' : 'ACTIVER'}
                    </Button>
                    <Button variant="outline" className="h-12 rounded-2xl border-border font-black text-[10px] uppercase text-destructive hover:bg-destructive hover:text-white transition-all">
                       <Trash2 className="w-4 h-4 mr-2" /> SUPPRIMER
                    </Button>
                 </div>
              </div>
           </Card>

           <div className="flex-1 space-y-8 w-full">
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StatWidget icon={<Zap className="w-5 h-5" />} label={isHacker ? "Score de Réputation" : "Programmes Actifs"} value={isHacker ? hacker.reputation.toString() : entreprise.programmesCount.toString()} color="blue" />
                 <StatWidget icon={<DollarSign className="w-5 h-5" />} label="Total Gains/Investi" value={isHacker ? "850K FCFA" : (entreprise.totalPaid/1000).toFixed(0) + "K FCFA"} color="green" />
                 <StatWidget icon={<Award className="w-5 h-5" />} label={isHacker ? "Bugs Corrigés" : "Rapports Reçus"} value={isHacker ? hacker.bugsFound.toString() : "42"} color="purple" />
              </div>

              <Tabs defaultValue="activity" className="space-y-6">
                 <TabsList className="bg-secondary/30 p-1 rounded-2xl border border-border h-14 w-full justify-start gap-2">
                    <TabsTrigger value="activity" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                       <History className="w-4 h-4 mr-2" /> Activité
                    </TabsTrigger>
                    <TabsTrigger value="kyc" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                       <ShieldCheck className="w-4 h-4 mr-2" /> Documents KYC
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl px-8 font-black uppercase text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                       <Lock className="w-4 h-4 mr-2" /> Sécurité & Logs
                    </TabsTrigger>
                 </TabsList>

                 <TabsContent value="activity">
                    <Card className="glass-card rounded-[32px] border-border overflow-hidden p-8 space-y-6">
                       <h3 className="text-xl font-black tracking-tight">Rapports Récents</h3>
                       <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                             <div key={i} className="p-5 rounded-3xl bg-secondary/20 border border-border flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                   <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                      <FileText className="w-5 h-5" />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold">Vulnérabilité SQLi sur l'endpoint /v1/auth</p>
                                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">PROGRAMME: SEEG GABON • IL Y A 3 JOURS</p>
                                   </div>
                                </div>
                                <Badge className="bg-orange-500 text-white text-[8px] font-black">CRITIQUE</Badge>
                             </div>
                          ))}
                       </div>
                       <Button variant="ghost" className="w-full text-blue-500 font-black text-[10px] uppercase tracking-widest">Voir tout l'historique</Button>
                    </Card>
                 </TabsContent>

                 <TabsContent value="kyc">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <KycDocCard label="Passeport (Recto)" status="validé" />
                       <KycDocCard label="Passeport (Verso)" status="validé" />
                       <KycDocCard label="Justificatif de domicile" status="en_cours" />
                       <KycDocCard label="Photo d'identité" status="validé" />
                    </div>
                 </TabsContent>

                 <TabsContent value="security">
                    <Card className="glass-card rounded-[32px] border-border overflow-hidden">
                       <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                          <h3 className="text-sm font-black uppercase tracking-widest">Logs d'audit spécifique</h3>
                          <Badge variant="outline" className="text-[10px] font-black border-border">FILTRÉ PAR USER_ID</Badge>
                       </div>
                       <ScrollArea className="h-[400px]">
                          <div className="divide-y divide-border font-mono">
                             {logs.slice(0, 10).map((log) => (
                                <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-secondary/20">
                                   <div className={`h-2 w-2 rounded-full ${log.level === 'critical' ? 'bg-destructive' : 'bg-blue-500'}`} />
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                         <span className="text-[10px] font-black text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                                         <Badge className="text-[7px] font-black h-3.5 px-1 bg-secondary text-foreground border-none uppercase">{log.type}</Badge>
                                      </div>
                                      <p className="text-[11px] font-medium truncate">{log.message}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </ScrollArea>
                    </Card>
                 </TabsContent>
              </Tabs>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50">
       <div className="text-blue-500">{icon}</div>
       <div className="min-w-0">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-xs font-bold text-foreground truncate">{value}</p>
       </div>
    </div>
  );
}

function StatWidget({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600/10 text-blue-600 border-blue-600/20",
    green: "bg-green-600/10 text-green-600 border-green-600/20",
    purple: "bg-purple-600/10 text-purple-600 border-purple-600/20",
  };
  return (
    <Card className={`p-6 rounded-[32px] border ${colors[color]} space-y-3`}>
       <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center border border-inherit">
          {icon}
       </div>
       <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-black tracking-tighter">{value}</p>
       </div>
    </Card>
  );
}

function KycDocCard({ label, status }: { label: string, status: 'validé' | 'rejeté' | 'en_cours' }) {
  return (
    <Card className="p-6 rounded-[32px] border-border bg-secondary/10 space-y-4 group hover:border-blue-500/30 transition-all cursor-pointer">
       <div className="flex justify-between items-start">
          <div className="h-12 w-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-blue-500 transition-colors">
             <FileText className="w-6 h-6" />
          </div>
          <Badge className={`text-[8px] font-black uppercase ${
             status === 'validé' ? 'bg-green-500 text-white' : 
             status === 'rejeté' ? 'bg-destructive text-white' : 'bg-orange-500 text-white'
          }`}>{status}</Badge>
       </div>
       <div>
          <p className="text-sm font-black">{label}</p>
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
             <Info className="w-3 h-3" /> Cliquez pour prévisualiser
          </p>
       </div>
    </Card>
  );
}
