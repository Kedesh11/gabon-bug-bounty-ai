import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tag, Plus, Trash2, Pencil, Lock, Sparkles } from "lucide-react";
import {
  useVulnerabilityCategories,
  useCreateVulnerabilityCategory,
  useUpdateVulnerabilityCategory,
  useDeleteVulnerabilityCategory,
  type VulnerabilityCategory,
  type AdminCategoryInput,
} from "@/hooks/api/taxonomy";
import { apiErrorMessage } from "@/lib/apiClient";
import { useContent } from "@/hooks/api/content";

const SEVERITY_OPTIONS = ["critique", "haute", "moyenne", "faible", "info"];
const NONE_VALUE = "__none__";

interface CategoryFormValue {
  name: string;
  cweId: string;
  defaultSeverity: string;
  description: string;
  parentId: string;
}

function emptyForm(): CategoryFormValue {
  return { name: "", cweId: "", defaultSeverity: "", description: "", parentId: "" };
}

function toFormValue(category: VulnerabilityCategory): CategoryFormValue {
  return {
    name: category.name,
    cweId: category.cweId ?? "",
    defaultSeverity: category.defaultSeverity ?? "",
    description: category.description ?? "",
    parentId: category.parentId ?? "",
  };
}

function CategoryFormFields({
  value,
  onChange,
  categories,
  excludeId,
}: {
  value: CategoryFormValue;
  onChange: (next: CategoryFormValue) => void;
  categories: VulnerabilityCategory[];
  excludeId?: string;
}) {
  const parentOptions = categories.filter((c) => c.id !== excludeId && !c.parentId);

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest">Nom</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ex: Broken Object Level Authorization" className="bg-secondary/50" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-widest">CWE (optionnel)</Label>
          <Input value={value.cweId} onChange={(e) => onChange({ ...value, cweId: e.target.value })} placeholder="Ex: CWE-79" className="bg-secondary/50 font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-widest">Sévérité par défaut</Label>
          <Select value={value.defaultSeverity || NONE_VALUE} onValueChange={(v) => onChange({ ...value, defaultSeverity: v === NONE_VALUE ? "" : v })}>
            <SelectTrigger className="bg-secondary/50 border-border">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent className="glass-card border-border">
              <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest">Catégorie parente (optionnel)</Label>
        <Select value={value.parentId || NONE_VALUE} onValueChange={(v) => onChange({ ...value, parentId: v === NONE_VALUE ? "" : v })}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Aucune (catégorie de premier niveau)" />
          </SelectTrigger>
          <SelectContent className="glass-card border-border">
            <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
            {parentOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest">Description (optionnel)</Label>
        <Textarea value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} className="bg-secondary/50 min-h-20" />
      </div>
    </div>
  );
}

function toInput(value: CategoryFormValue): AdminCategoryInput {
  return {
    name: value.name.trim(),
    cweId: value.cweId.trim() || undefined,
    defaultSeverity: value.defaultSeverity || undefined,
    description: value.description.trim() || undefined,
    parentId: value.parentId || undefined,
  };
}

function CreateCategoryDialog({ categories }: { categories: VulnerabilityCategory[] }) {
  const dialogTitle = useContent("admin.taxonomy.create-dialog.title", "Créer une catégorie");
  const dialogDescription = useContent(
    "admin.taxonomy.create-dialog.description",
    "Contrôle total, sans fusion automatique — contrairement à la proposition depuis le formulaire hacker.",
  );
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<CategoryFormValue>(emptyForm());
  const createCategory = useCreateVulnerabilityCategory();

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setValue(emptyForm()); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> NOUVELLE CATÉGORIE
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <CategoryFormFields value={value} onChange={setValue} categories={categories} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={value.name.trim().length < 2 || createCategory.isPending}
            onClick={() => {
              createCategory.mutate(toInput(value), {
                onSuccess: () => {
                  toast.success("Catégorie créée");
                  setOpen(false);
                  setValue(emptyForm());
                },
                onError: (err) => toast.error(apiErrorMessage(err)),
              });
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

function EditCategoryDialog({
  category,
  categories,
  open,
  onOpenChange,
}: {
  category: VulnerabilityCategory;
  categories: VulnerabilityCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const descriptionSystem = useContent("admin.taxonomy.edit-dialog.description-system", "Catégorie du catalogue de base.");
  const descriptionProposed = useContent(
    "admin.taxonomy.edit-dialog.description-proposed",
    "Catégorie proposée par un hacker ou créée manuellement — complétez le CWE, la sévérité et la hiérarchie.",
  );
  const [value, setValue] = useState<CategoryFormValue>(toFormValue(category));
  const updateCategory = useUpdateVulnerabilityCategory();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) setValue(toFormValue(category)); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[560px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter">Modifier — {category.name}</DialogTitle>
          <DialogDescription>
            {category.isSystem ? descriptionSystem : descriptionProposed}
          </DialogDescription>
        </DialogHeader>
        <CategoryFormFields value={value} onChange={setValue} categories={categories} excludeId={category.id} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={value.name.trim().length < 2 || updateCategory.isPending}
            onClick={() => {
              updateCategory.mutate(
                {
                  id: category.id,
                  data: {
                    name: value.name.trim(),
                    cweId: value.cweId.trim() || null,
                    defaultSeverity: value.defaultSeverity || null,
                    description: value.description.trim() || null,
                    parentId: value.parentId || null,
                  },
                },
                {
                  onSuccess: () => {
                    toast.success("Catégorie mise à jour");
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                },
              );
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

export default function AdminTaxonomy() {
  const pageTitle = useContent("admin.taxonomy.title", "Taxonomie des vulnérabilités");
  const pageSubtitle = useContent(
    "admin.taxonomy.subtitle",
    "Catalogue de base + catégories proposées par les hackers — complétez-les avec un CWE et une sévérité.",
  );
  const { data: categories = [] } = useVulnerabilityCategories();
  const deleteCategory = useDeleteVulnerabilityCategory();
  const [editingCategory, setEditingCategory] = useState<VulnerabilityCategory | null>(null);

  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pageSubtitle}
            </p>
          </div>
          <CreateCategoryDialog categories={categories} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topLevel.map((category) => {
            const children = categories.filter((c) => c.parentId === category.id);
            return (
              <div key={category.id} className="glass-card rounded-xl p-5 border-border space-y-3">
                <CategoryRow category={category} onEdit={() => setEditingCategory(category)} onDelete={() => deleteCategory.mutate(category.id, {
                  onSuccess: () => toast.success("Catégorie supprimée"),
                  onError: (err) => toast.error(apiErrorMessage(err)),
                })} />
                {children.length > 0 && (
                  <div className="pl-4 border-l-2 border-border space-y-3">
                    {children.map((child) => (
                      <CategoryRow
                        key={child.id}
                        category={child}
                        onEdit={() => setEditingCategory(child)}
                        onDelete={() => deleteCategory.mutate(child.id, {
                          onSuccess: () => toast.success("Catégorie supprimée"),
                          onError: (err) => toast.error(apiErrorMessage(err)),
                        })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editingCategory && byId[editingCategory.id] && (
          <EditCategoryDialog
            category={byId[editingCategory.id]}
            categories={categories}
            open={!!editingCategory}
            onOpenChange={(open) => !open && setEditingCategory(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function CategoryRow({ category, onEdit, onDelete }: { category: VulnerabilityCategory; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-foreground text-sm">{category.name}</p>
          {category.isSystem ? (
            <Badge variant="outline" className="text-[9px] gap-1 border-border">
              <Lock className="w-2.5 h-2.5" /> BASE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] gap-1 border-primary/30 text-primary">
              <Sparkles className="w-2.5 h-2.5" /> PROPOSÉE
            </Badge>
          )}
          {category.defaultSeverity && (
            <Badge variant="outline" className="text-[9px] border-border capitalize">{category.defaultSeverity}</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {category.cweId ?? "Pas de CWE assigné"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        {!category.isSystem && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
