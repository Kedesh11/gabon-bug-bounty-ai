import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus, Trash2, Pencil, Lock } from "lucide-react";
import { usePermissionCatalog, useRoles, useCreateRole, useUpdateRolePermissions, useDeleteRole, type RoleDef } from "@/hooks/api/roles";
import { apiErrorMessage } from "@/lib/apiClient";

function PermissionChecklist({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const { data: permissions = [] } = usePermissionCatalog();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2">
      {permissions.map((perm) => (
        <label
          key={perm.key}
          className="flex items-start gap-2 p-2 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
        >
          <Checkbox checked={selected.includes(perm.key)} onCheckedChange={() => onToggle(perm.key)} className="mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{perm.label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{perm.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const createRole = useCreateRole();

  const togglePermission = (key: string) => {
    setPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const reset = () => {
    setLabel("");
    setDescription("");
    setPermissionKeys([]);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> NOUVEAU RÔLE
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Créer un rôle
          </DialogTitle>
          <DialogDescription>
            Un nouveau rôle peut recevoir n'importe quelle combinaison des permissions existantes — aucun déploiement requis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Nom du rôle</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Auditeur Conformité" className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Description (optionnel)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Permissions</Label>
            <PermissionChecklist selected={permissionKeys} onToggle={togglePermission} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={!label.trim() || createRole.isPending}
            onClick={() => {
              createRole.mutate(
                { label: label.trim(), description: description.trim() || undefined, permissionKeys },
                {
                  onSuccess: () => {
                    toast.success("Rôle créé");
                    setOpen(false);
                    reset();
                  },
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

function EditPermissionsDialog({ role, open, onOpenChange }: { role: RoleDef; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [permissionKeys, setPermissionKeys] = useState<string[]>(role.permissions);
  const updatePermissions = useUpdateRolePermissions();

  const togglePermission = (key: string) => {
    setPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPermissionKeys(role.permissions);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[560px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tighter">Permissions — {role.label}</DialogTitle>
          <DialogDescription>Les comptes ayant ce rôle voient l'effet immédiatement, sans redémarrage.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <PermissionChecklist selected={permissionKeys} onToggle={togglePermission} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">ANNULER</Button>
          <Button
            disabled={updatePermissions.isPending}
            onClick={() => {
              updatePermissions.mutate(
                { id: role.id, permissionKeys },
                {
                  onSuccess: () => {
                    toast.success("Permissions mises à jour");
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

export default function AdminRoles() {
  const { data: roles = [] } = useRoles();
  const deleteRole = useDeleteRole();
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Rôles & Permissions
            </h1>
            <p className="text-sm text-muted-foreground">
              Créez un rôle et attribuez-lui des permissions existantes — aucune modification de code nécessaire.
            </p>
          </div>
          <CreateRoleDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="glass-card rounded-xl p-5 border-border space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground">{role.label}</p>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-[9px] gap-1 border-border">
                        <Lock className="w-2.5 h-2.5" /> SYSTÈME
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{role.key}</p>
                  {role.description && <p className="text-xs text-muted-foreground mt-1">{role.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingRole(role)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        deleteRole.mutate(role.id, {
                          onSuccess: () => toast.success("Rôle supprimé"),
                          onError: (err) => toast.error(apiErrorMessage(err)),
                        })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic">Aucune permission</span>
                ) : (
                  role.permissions.slice(0, 6).map((p) => (
                    <Badge key={p} variant="outline" className="text-[9px] font-mono border-border">{p}</Badge>
                  ))
                )}
                {role.permissions.length > 6 && (
                  <Badge variant="outline" className="text-[9px] border-border">+{role.permissions.length - 6}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingRole && (
          <EditPermissionsDialog
            role={editingRole}
            open={!!editingRole}
            onOpenChange={(open) => !open && setEditingRole(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
