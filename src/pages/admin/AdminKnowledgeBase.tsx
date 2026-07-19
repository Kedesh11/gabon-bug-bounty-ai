import DashboardLayout from "@/components/DashboardLayout";
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  Clock,
  Star,
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/hooks/api/content";

export default function AdminKnowledgeBase() {
  const pageTitle = useContent("admin.knowledge-base.title", "Base de Connaissances");
  const pageSubtitle = useContent("admin.knowledge-base.subtitle", "Protocoles officiels et guides de résolution pour le Support.");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const categories = [
    { title: "Protocoles de Triage", icon: <Zap className="w-5 h-5 text-orange-500" />, articles: 12 },
    { title: "Médiation & Litiges", icon: <ShieldCheck className="w-5 h-5 text-blue-500" />, articles: 8 },
    { title: "Guides Plateforme", icon: <BookOpen className="w-5 h-5 text-purple-500" />, articles: 15 },
    { title: "Sécurité & Audit", icon: <FileText className="w-5 h-5 text-green-500" />, articles: 6 },
  ];

  const articles = [
    { id: 1, title: "Détermination de la sévérité CVSS v3.1", category: "Protocoles", time: "5 min", popular: true },
    { id: 2, title: "Gestion des duplicatas et collisions", category: "Triage", time: "3 min", popular: false },
    { id: 3, title: "Politique de paiement Moov/Airtel", category: "Finance", time: "4 min", popular: true },
    { id: 4, title: "Comment gérer un chercheur mécontent ?", category: "Médiation", time: "8 min", popular: true },
    { id: 5, title: "Anatomie d'un rapport de qualité", category: "Guides", time: "6 min", popular: false },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> Retour au support
            </button>
            <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" /> {pageTitle}
            </h1>
            <p className="text-muted-foreground font-medium italic">{pageSubtitle}</p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Rechercher un protocole, un guide..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-12 h-14 bg-secondary/30 border-border rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10" 
            />
          </div>
        </div>

        {/* Quick Access Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {categories.map((cat, i) => (
              <Card key={i} className="glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all cursor-pointer group">
                 <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {cat.icon}
                 </div>
                 <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{cat.title}</h3>
                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{cat.articles} Articles</p>
              </Card>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Popular Articles */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" /> Articles Tendances
                 </h2>
                 <Button variant="link" className="text-blue-500 text-[10px] font-black uppercase">Tout voir</Button>
              </div>
              <div className="space-y-4">
                 {articles.map((art) => (
                    <Card key={art.id} className="p-6 rounded-[32px] border-border bg-secondary/20 hover:bg-secondary/40 transition-all flex items-center justify-between cursor-pointer group">
                       <div className="flex items-center gap-5">
                          <div className="h-12 w-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-blue-500 transition-colors">
                             <FileText className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{art.title}</h4>
                             <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="text-[8px] font-black uppercase border-border h-4">{art.category}</Badge>
                                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                   <Clock className="w-3 h-3" /> {art.time} de lecture
                                </span>
                             </div>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-all" />
                    </Card>
                 ))}
              </div>
           </div>

           {/* Announcements & Quick Links */}
           <div className="space-y-8">
              <Card className="p-8 rounded-[40px] border-blue-500/20 bg-blue-600/5 space-y-6">
                 <div className="flex items-center gap-3">
                    <HelpCircle className="w-6 h-6 text-blue-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Aide Rapide</h3>
                 </div>
                 <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Vous ne trouvez pas la réponse à un cas spécifique ? Contactez l'administrateur principal ou utilisez le canal de triage Slack.
                 </p>
                 <Button className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase shadow-xl shadow-blue-600/20">
                    CONTACTER ADMIN
                 </Button>
              </Card>

              <Card className="p-8 rounded-[40px] border-border bg-secondary/10 space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest">Liens Externes</h3>
                 <div className="space-y-2">
                    <ExternalLinkItem label="Documentation CVSS v3.1" />
                    <ExternalLinkItem label="Gabon Digital Policy" />
                    <ExternalLinkItem label="OWASP Top 10 Guide" />
                 </div>
              </Card>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ExternalLinkItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-all cursor-pointer group">
       <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
       <ExternalLink className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}
