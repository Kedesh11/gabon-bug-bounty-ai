import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutPanelTop, Plus, Trash2, Pencil, ArrowUp, ArrowDown, ExternalLink, FileText, PanelBottom } from "lucide-react";
import {
  useAllNavbarItems,
  useCreateNavbarItem,
  useUpdateNavbarItem,
  useDeleteNavbarItem,
  useReorderNavbarItems,
  useFooterColumns,
  useCreateFooterColumn,
  useUpdateFooterColumn,
  useDeleteFooterColumn,
  useReorderFooterColumns,
  useCreateFooterLink,
  useUpdateFooterLink,
  useDeleteFooterLink,
  useReorderFooterLinks,
  useContentEntries,
  useUpsertContentEntry,
  useDeleteContentEntry,
  type NavbarItem,
  type FooterColumn,
  type ContentEntry,
  type ContentValueType,
} from "@/hooks/api/content";
import { apiErrorMessage } from "@/lib/apiClient";

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// -----------------------------------------------------------------------------
// Navigation tab
// -----------------------------------------------------------------------------

function NavbarItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: NavbarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [isExternal, setIsExternal] = useState(item?.isExternal ?? false);
  const createItem = useCreateNavbarItem();
  const updateItem = useUpdateNavbarItem();
  const pending = createItem.isPending || updateItem.isPending;

  const reset = (next: NavbarItem | null) => {
    setLabel(next?.label ?? "");
    setUrl(next?.url ?? "");
    setIsExternal(next?.isExternal ?? false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset(item);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter">{item ? `Modifier — ${item.label}` : "Nouveau lien"}</DialogTitle>
          <DialogDescription>Apparaît dans la navbar publique, desktop et mobile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Programmes" className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/programmes" className="bg-secondary/50 font-mono" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="text-sm font-semibold">Lien externe</Label>
            <Switch checked={isExternal} onCheckedChange={setIsExternal} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={label.trim().length < 1 || url.trim().length < 1 || pending}
            onClick={() => {
              const data = { label: label.trim(), url: url.trim(), isExternal };
              const mutation = item ? updateItem.mutate({ id: item.id, data }, {
                onSuccess: () => { toast.success("Lien mis à jour"); onOpenChange(false); },
                onError: (err) => toast.error(apiErrorMessage(err)),
              }) : createItem.mutate(data, {
                onSuccess: () => { toast.success("Lien créé"); onOpenChange(false); },
                onError: (err) => toast.error(apiErrorMessage(err)),
              });
              return mutation;
            }}
            className="bg-primary text-primary-foreground font-bold"
          >
            {item ? "ENREGISTRER" : "CRÉER"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NavigationTab() {
  const { data: items = [] } = useAllNavbarItems();
  const reorder = useReorderNavbarItems();
  const updateItem = useUpdateNavbarItem();
  const deleteItem = useDeleteNavbarItem();
  const [dialogItem, setDialogItem] = useState<NavbarItem | null | undefined>(undefined);

  const handleMove = (index: number, direction: -1 | 1) => {
    const reordered = move(items, index, direction);
    if (reordered === items) return;
    reorder.mutate(reordered.map((i) => i.id), { onError: (err) => toast.error(apiErrorMessage(err)) });
  };

  return (
    <TabsContent value="navigation" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Liens affichés dans la barre de navigation publique, dans l'ordre.</p>
        <Button className="gap-2 font-bold" onClick={() => setDialogItem(null)}>
          <Plus className="w-4 h-4" /> NOUVEAU LIEN
        </Button>
      </div>

      <div className="glass-card rounded-xl border-border divide-y divide-border">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 p-4">
            <div className="flex flex-col">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === 0} onClick={() => handleMove(index, -1)}>
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === items.length - 1} onClick={() => handleMove(index, 1)}>
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground text-sm">{item.label}</p>
                {item.isExternal && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                {!item.visible && <Badge variant="outline" className="text-[9px] border-border">MASQUÉ</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{item.url}</p>
            </div>
            <Switch
              checked={item.visible}
              onCheckedChange={(visible) => updateItem.mutate({ id: item.id, data: { visible } }, { onError: (err) => toast.error(apiErrorMessage(err)) })}
            />
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setDialogItem(item)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteItem.mutate(item.id, {
                onSuccess: () => toast.success("Lien supprimé"),
                onError: (err) => toast.error(apiErrorMessage(err)),
              })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Aucun lien de navigation.</p>}
      </div>

      {dialogItem !== undefined && (
        <NavbarItemDialog item={dialogItem} open={dialogItem !== undefined} onOpenChange={(open) => !open && setDialogItem(undefined)} />
      )}
    </TabsContent>
  );
}

// -----------------------------------------------------------------------------
// Footer tab
// -----------------------------------------------------------------------------

function FooterLinkDialog({
  columnId,
  link,
  open,
  onOpenChange,
}: {
  columnId: string;
  link: { id: string; label: string; url: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState(link?.label ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const createLink = useCreateFooterLink();
  const updateLink = useUpdateFooterLink();
  const pending = createLink.isPending || updateLink.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) { setLabel(link?.label ?? ""); setUrl(link?.url ?? ""); }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tighter">{link ? "Modifier le lien" : "Nouveau lien"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} className="bg-secondary/50 font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={label.trim().length < 1 || url.trim().length < 1 || pending}
            onClick={() => {
              const data = { label: label.trim(), url: url.trim() };
              if (link) {
                updateLink.mutate({ id: link.id, data }, {
                  onSuccess: () => { toast.success("Lien mis à jour"); onOpenChange(false); },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                });
              } else {
                createLink.mutate({ columnId, ...data }, {
                  onSuccess: () => { toast.success("Lien créé"); onOpenChange(false); },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                });
              }
            }}
            className="bg-primary text-primary-foreground font-bold"
          >
            {link ? "ENREGISTRER" : "CRÉER"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FooterColumnCard({ column, canMoveUp, canMoveDown, onMove }: {
  column: FooterColumn;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const [title, setTitle] = useState(column.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const updateColumn = useUpdateFooterColumn();
  const deleteColumn = useDeleteFooterColumn();
  const deleteLink = useDeleteFooterLink();
  const reorderLinks = useReorderFooterLinks();
  const [linkDialog, setLinkDialog] = useState<{ id: string; label: string; url: string } | null | undefined>(undefined);

  const handleMoveLink = (index: number, direction: -1 | 1) => {
    const reordered = move(column.links, index, direction);
    if (reordered === column.links) return;
    reorderLinks.mutate({ columnId: column.id, ids: reordered.map((l) => l.id) }, { onError: (err) => toast.error(apiErrorMessage(err)) });
  };

  return (
    <div className="glass-card rounded-xl border-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={!canMoveUp} onClick={() => onMove(-1)}>
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={!canMoveDown} onClick={() => onMove(1)}>
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
        {editingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (title.trim() && title.trim() !== column.title) {
                updateColumn.mutate({ id: column.id, title: title.trim() }, { onError: (err) => toast.error(apiErrorMessage(err)) });
              } else {
                setTitle(column.title);
              }
            }}
            autoFocus
            className="bg-secondary/50 font-bold h-8 flex-1"
          />
        ) : (
          <button className="font-bold text-foreground text-sm flex-1 text-left" onClick={() => setEditingTitle(true)}>
            {column.title}
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => deleteColumn.mutate(column.id, {
            onSuccess: () => toast.success("Colonne supprimée"),
            onError: (err) => toast.error(apiErrorMessage(err)),
          })}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-2 pl-4 border-l-2 border-border">
        {column.links.map((link, index) => (
          <div key={link.id} className="flex items-center gap-2">
            <div className="flex flex-col">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={index === 0} onClick={() => handleMoveLink(index, -1)}>
                <ArrowUp className="w-2.5 h-2.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={index === column.links.length - 1} onClick={() => handleMoveLink(index, 1)}>
                <ArrowDown className="w-2.5 h-2.5" />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{link.label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{link.url}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setLinkDialog(link)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteLink.mutate(link.id, { onError: (err) => toast.error(apiErrorMessage(err)) })}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="gap-1 font-bold text-xs" onClick={() => setLinkDialog(null)}>
          <Plus className="w-3 h-3" /> LIEN
        </Button>
      </div>

      {linkDialog !== undefined && (
        <FooterLinkDialog columnId={column.id} link={linkDialog} open={linkDialog !== undefined} onOpenChange={(open) => !open && setLinkDialog(undefined)} />
      )}
    </div>
  );
}

function FooterTab() {
  const { data: columns = [] } = useFooterColumns();
  const createColumn = useCreateFooterColumn();
  const reorderColumns = useReorderFooterColumns();
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const handleMoveColumn = (index: number, direction: -1 | 1) => {
    const reordered = move(columns, index, direction);
    if (reordered === columns) return;
    reorderColumns.mutate(reordered.map((c) => c.id), { onError: (err) => toast.error(apiErrorMessage(err)) });
  };

  return (
    <TabsContent value="footer" className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Colonnes et liens du pied de page public.</p>
        <div className="flex items-center gap-2">
          <Input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Titre de la colonne"
            className="bg-secondary/50 h-9 w-48"
          />
          <Button
            className="gap-2 font-bold"
            disabled={newColumnTitle.trim().length < 1 || createColumn.isPending}
            onClick={() => {
              createColumn.mutate(newColumnTitle.trim(), {
                onSuccess: () => { toast.success("Colonne créée"); setNewColumnTitle(""); },
                onError: (err) => toast.error(apiErrorMessage(err)),
              });
            }}
          >
            <Plus className="w-4 h-4" /> COLONNE
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columns.map((column, index) => (
          <FooterColumnCard
            key={column.id}
            column={column}
            canMoveUp={index > 0}
            canMoveDown={index < columns.length - 1}
            onMove={(direction) => handleMoveColumn(index, direction)}
          />
        ))}
        {columns.length === 0 && <p className="text-sm text-muted-foreground">Aucune colonne de pied de page.</p>}
      </div>
    </TabsContent>
  );
}

// -----------------------------------------------------------------------------
// Page content tab
// -----------------------------------------------------------------------------

function ContentEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ContentEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [key, setKey] = useState(entry?.key ?? "");
  const [type, setType] = useState<ContentValueType>(entry?.type ?? "text");
  const [value, setValue] = useState(entry?.value ?? "");
  const upsert = useUpsertContentEntry();

  const jsonError = type === "json" && value.trim().length > 0 ? (() => {
    try { JSON.parse(value); return null; } catch { return "JSON invalide"; }
  })() : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) { setKey(entry?.key ?? ""); setType(entry?.type ?? "text"); setValue(entry?.value ?? ""); }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[560px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter">{entry ? `Modifier — ${entry.key}` : "Nouvelle entrée de contenu"}</DialogTitle>
          <DialogDescription>Clé namespacée par page, ex: "documentation.intro.texte". Une page qui ne lit pas encore cette clé n'est pas affectée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Clé</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} disabled={!!entry} placeholder="page.section.champ" className="bg-secondary/50 font-mono" />
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-xs font-black uppercase tracking-widest">Type</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={type === "text" ? "default" : "outline"} onClick={() => setType("text")}>Texte</Button>
              <Button type="button" size="sm" variant={type === "json" ? "default" : "outline"} onClick={() => setType("json")}>JSON</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Valeur</Label>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`bg-secondary/50 min-h-32 ${type === "json" ? "font-mono text-xs" : ""}`}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={key.trim().length < 2 || !!jsonError || upsert.isPending}
            onClick={() => {
              upsert.mutate({ key: key.trim(), type, value }, {
                onSuccess: () => { toast.success("Entrée enregistrée"); onOpenChange(false); },
                onError: (err) => toast.error(apiErrorMessage(err)),
              });
            }}
            className="bg-primary text-primary-foreground font-bold"
          >
            ENREGISTRER
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContentTab() {
  const { data: entries = [] } = useContentEntries();
  const deleteEntry = useDeleteContentEntry();
  const [dialogEntry, setDialogEntry] = useState<ContentEntry | null | undefined>(undefined);

  const groups = entries.reduce<Record<string, ContentEntry[]>>((acc, entry) => {
    const page = entry.key.split(".")[0] || "autre";
    (acc[page] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <TabsContent value="contenu" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Textes et blocs structurés des pages, regroupés par préfixe de clé.</p>
        <Button className="gap-2 font-bold" onClick={() => setDialogEntry(null)}>
          <Plus className="w-4 h-4" /> NOUVELLE ENTRÉE
        </Button>
      </div>

      {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([page, pageEntries]) => (
        <div key={page} className="glass-card rounded-xl border-border p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">{page}</p>
          <div className="divide-y divide-border">
            {pageEntries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-foreground">{entry.key}</p>
                    <Badge variant="outline" className="text-[9px] border-border">{entry.type.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-lg">{entry.value}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setDialogEntry(entry)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEntry.mutate(entry.id, {
                      onSuccess: () => toast.success("Entrée supprimée"),
                      onError: (err) => toast.error(apiErrorMessage(err)),
                    })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée de contenu personnalisée pour l'instant.</p>}

      {dialogEntry !== undefined && (
        <ContentEntryDialog entry={dialogEntry} open={dialogEntry !== undefined} onOpenChange={(open) => !open && setDialogEntry(undefined)} />
      )}
    </TabsContent>
  );
}

// -----------------------------------------------------------------------------

export default function AdminContenu() {
  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <LayoutPanelTop className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter">Contenu du site</h1>
            <p className="text-sm text-muted-foreground">Navbar, pied de page et contenu des pages — modifiables sans déploiement.</p>
          </div>
        </div>

        <Tabs defaultValue="navigation" className="w-full space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-2xl border border-border h-14 w-full justify-start gap-2">
            <TabsTrigger value="navigation" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <LayoutPanelTop className="w-4 h-4" /> Navigation
            </TabsTrigger>
            <TabsTrigger value="footer" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <PanelBottom className="w-4 h-4" /> Pied de page
            </TabsTrigger>
            <TabsTrigger value="contenu" className="rounded-xl px-6 h-11 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-bold gap-2">
              <FileText className="w-4 h-4" /> Contenu des pages
            </TabsTrigger>
          </TabsList>

          <NavigationTab />
          <FooterTab />
          <ContentTab />
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
