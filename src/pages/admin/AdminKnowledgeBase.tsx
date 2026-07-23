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
  ExternalLink,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Gavel,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/hooks/api/content";
import { useAuth } from "@/contexts/useAuth";
import { useKbArticles, useCreateKbArticle, useUpdateKbArticle, useDeleteKbArticle, KbArticle } from "@/hooks/api/kb";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/apiClient";

const CATEGORY_ICONS: Record<string, ReactNode> = {
  Protocoles: <Zap className="w-5 h-5 text-orange-500" />,
  Triage: <Zap className="w-5 h-5 text-orange-500" />,
  Médiation: <Gavel className="w-5 h-5 text-blue-500" />,
  Finance: <DollarSign className="w-5 h-5 text-green-500" />,
  Guides: <BookOpen className="w-5 h-5 text-purple-500" />,
  Sécurité: <ShieldCheck className="w-5 h-5 text-green-500" />,
};

function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? <FileText className="w-5 h-5 text-muted-foreground" />;
}

function estimateReadTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

export default function AdminKnowledgeBase() {
  const pageTitle = useContent("admin.knowledge-base.title", "Base de Connaissances");
  const pageSubtitle = useContent("admin.knowledge-base.subtitle", "Protocoles officiels et guides de résolution pour le Support.");
  const trendingHeading = useContent("admin.knowledge-base.trending-heading", "Articles Récents");
  const quickHelpTitle = useContent("admin.knowledge-base.quick-help.title", "Aide Rapide");
  const quickHelpText = useContent(
    "admin.knowledge-base.quick-help.text",
    "Vous ne trouvez pas la réponse à un cas spécifique ? Contactez l'administrateur principal ou utilisez le canal de triage Slack.",
  );
  const linksHeading = useContent("admin.knowledge-base.links-heading", "Liens Externes");
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageKb = user?.permissions.includes("kb.manage") ?? false;

  const { data: articles = [] } = useKbArticles();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KbArticle | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return [...counts.entries()].map(([title, count]) => ({ title, count }));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (!term) return true;
      return a.title.toLowerCase().includes(term) || a.body.toLowerCase().includes(term) || a.category.toLowerCase().includes(term);
    });
  }, [articles, search, categoryFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
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
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Rechercher un protocole, un guide..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 bg-secondary/30 border-border rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            {canManageKb && <NewKbArticleDialog />}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.title}
              onClick={() => setCategoryFilter(categoryFilter === cat.title ? null : cat.title)}
              className={`glass-card p-6 rounded-[32px] border-border hover:border-blue-500/30 transition-all cursor-pointer group ${categoryFilter === cat.title ? "border-blue-500/60 bg-blue-500/5" : ""}`}
            >
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {categoryIcon(cat.title)}
              </div>
              <h3 className="font-black text-foreground group-hover:text-blue-500 transition-colors">{cat.title}</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{cat.count} Article{cat.count !== 1 ? "s" : ""}</p>
            </Card>
          ))}
          {categories.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-4">Aucun article pour le moment.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest">{trendingHeading}</h2>
            <div className="space-y-4">
              {filteredArticles.map((art) => (
                <Card
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-6 rounded-[32px] border-border bg-secondary/20 hover:bg-secondary/40 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-blue-500 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{art.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-border h-4">{art.category}</Badge>
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {estimateReadTime(art.body)} de lecture
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-all" />
                </Card>
              ))}
              {filteredArticles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun article ne correspond à cette recherche.</p>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <Card className="p-8 rounded-[40px] border-blue-500/20 bg-blue-600/5 space-y-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                <h3 className="text-sm font-black uppercase tracking-widest">{quickHelpTitle}</h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">{quickHelpText}</p>
              <Button
                onClick={() => navigate("/admin/support")}
                className="w-full h-12 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase shadow-xl shadow-blue-600/20"
              >
                CONTACTER ADMIN
              </Button>
            </Card>

            <Card className="p-8 rounded-[40px] border-border bg-secondary/10 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest">{linksHeading}</h3>
              <div className="space-y-2">
                <ExternalLinkItem label="OWASP Top 10" href="https://owasp.org/www-project-top-ten/" />
                <ExternalLinkItem label="Calculateur CVSS v3.1" href="https://www.first.org/cvss/calculator/3.1" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <KbArticleDialog article={selectedArticle} canManage={canManageKb} onOpenChange={(open) => !open && setSelectedArticle(null)} />
    </DashboardLayout>
  );
}

function ExternalLinkItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-all cursor-pointer group"
    >
      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      <ExternalLink className="w-3 h-3 text-muted-foreground" />
    </a>
  );
}

function NewKbArticleDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const createArticle = useCreateKbArticle();

  const reset = () => {
    setTitle("");
    setCategory("");
    setBody("");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="h-14 rounded-2xl font-black text-[10px] uppercase shrink-0 gap-2">
          <Plus className="w-4 h-4" /> Nouvel Article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel article</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Catégorie (ex: Triage, Finance, Guides)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea placeholder="Contenu de l'article" value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
        </div>
        <DialogFooter>
          <Button
            disabled={title.trim().length < 3 || category.trim().length < 1 || body.trim().length < 1 || createArticle.isPending}
            onClick={() =>
              createArticle.mutate(
                { title: title.trim(), category: category.trim(), body: body.trim() },
                {
                  onSuccess: () => { toast.success("Article créé"); setOpen(false); reset(); },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                },
              )
            }
          >
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KbArticleDialog({
  article,
  canManage,
  onOpenChange,
}: {
  article: KbArticle | null;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const updateArticle = useUpdateKbArticle();
  const deleteArticle = useDeleteKbArticle();

  const startEditing = (a: KbArticle) => {
    setTitle(a.title);
    setCategory(a.category);
    setBody(a.body);
    setEditing(true);
  };

  return (
    <Dialog
      open={article !== null}
      onOpenChange={(next) => {
        if (!next) setEditing(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {article && !editing && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[8px] font-black uppercase">{article.category}</Badge>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {estimateReadTime(article.body)} de lecture
                </span>
              </div>
              <DialogTitle className="text-xl">{article.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{article.body}</p>
            <p className="text-[10px] text-muted-foreground">
              Par {article.author.name} · mis à jour le {new Date(article.updatedAt).toLocaleDateString("fr-FR")}
            </p>
            {canManage && (
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => startEditing(article)} className="gap-2">
                  <Pencil className="w-4 h-4" /> Modifier
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    deleteArticle.mutate(article.id, {
                      onSuccess: () => { toast.success("Article supprimé"); onOpenChange(false); },
                      onError: (err) => toast.error(apiErrorMessage(err)),
                    })
                  }
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </Button>
              </DialogFooter>
            )}
          </>
        )}

        {article && editing && (
          <>
            <DialogHeader>
              <DialogTitle>Modifier l'article</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button
                disabled={title.trim().length < 3 || category.trim().length < 1 || body.trim().length < 1 || updateArticle.isPending}
                onClick={() =>
                  updateArticle.mutate(
                    { id: article.id, title: title.trim(), category: category.trim(), body: body.trim() },
                    {
                      onSuccess: () => { toast.success("Article mis à jour"); setEditing(false); },
                      onError: (err) => toast.error(apiErrorMessage(err)),
                    },
                  )
                }
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
