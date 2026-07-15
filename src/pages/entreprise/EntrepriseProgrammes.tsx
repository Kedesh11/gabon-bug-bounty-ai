import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Edit2, ExternalLink, Plus, Save, Trash2, X } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useProgrammes, useCreateProgramme, useUpdateProgramme, useDeleteProgramme } from "@/hooks/api/programmes";
import { useAuth } from "@/contexts/useAuth";
import { apiErrorMessage } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Programme } from "@/types/domain";

type ProgrammeForm = {
  name: string;
  description: string;
  descriptionLong: string;
  scope: string;
  outOfScope: string;
  methodology: string;
  terms: string;
  disclosurePolicy: string;
  communicationChannels: string;
  tags: string;
  sector: string;
  website: string;
  logoUrl: string;
  programType: "public" | "private" | "vdp";
  rewardCurrency: "USD" | "EUR" | "XAF";
  minReward: string;
  maxReward: string;
  critMin: string;
  critMax: string;
  highMin: string;
  highMax: string;
  medMin: string;
  medMax: string;
  lowMin: string;
  lowMax: string;
  triageTimeHours: string;
  firstResponseHours: string;
  resolutionDays: string;
};

const DEFAULT_FORM: ProgrammeForm = {
  name: "",
  description: "",
  descriptionLong: "",
  scope: "",
  outOfScope: "",
  methodology: "",
  terms: "",
  disclosurePolicy: "",
  communicationChannels: "",
  tags: "",
  sector: "",
  website: "",
  logoUrl: "",
  programType: "public",
  rewardCurrency: "XAF",
  minReward: "",
  maxReward: "",
  critMin: "",
  critMax: "",
  highMin: "",
  highMax: "",
  medMin: "",
  medMax: "",
  lowMin: "",
  lowMax: "",
  triageTimeHours: "24",
  firstResponseHours: "12",
  resolutionDays: "21",
};

const parseList = (value: string) =>
  value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatList = (values?: string[]) => (values && values.length > 0 ? values.join("\n") : "");

const statusBadgeClass = (status: Programme["status"]) => {
  if (status === "actif") return "bg-primary/20 text-primary";
  if (status === "pause") return "bg-yellow-500/20 text-yellow-400";
  return "bg-destructive/20 text-destructive";
};

export default function EntrepriseProgrammes() {
  const { user } = useAuth();
  const { data: programmes = [] } = useProgrammes();
  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const deleteProgramme = useDeleteProgramme();

  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProgrammeForm>(DEFAULT_FORM);

  const myProgrammes = useMemo(
    () => programmes.filter((programme) => programme.entrepriseId === user?.entrepriseProfileId),
    [programmes, user?.entrepriseProfileId],
  );

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setShowAdd(false);
    setEditing(null);
  };

  const buildRewardTiers = () => {
    const tiers = [
      {
        severity: "critique" as const,
        min: toNumber(form.critMin, 0),
        max: toNumber(form.critMax, 0),
      },
      {
        severity: "haute" as const,
        min: toNumber(form.highMin, 0),
        max: toNumber(form.highMax, 0),
      },
      {
        severity: "moyenne" as const,
        min: toNumber(form.medMin, 0),
        max: toNumber(form.medMax, 0),
      },
      {
        severity: "faible" as const,
        min: toNumber(form.lowMin, 0),
        max: toNumber(form.lowMax, 0),
      },
    ].filter((tier) => tier.min > 0 && tier.max >= tier.min);

    return tiers.length > 0 ? tiers : undefined;
  };

  const validateCoreFields = () => {
    const minReward = toNumber(form.minReward, 0);
    const maxReward = toNumber(form.maxReward, 0);

    if (!form.name.trim()) return "Le nom du programme est obligatoire";
    if (!form.description.trim()) return "La description courte est obligatoire";
    if (parseList(form.scope).length === 0) return "Ajoutez au moins un élément dans le scope";
    if (minReward <= 0 || maxReward <= 0) return "Renseignez les montants de récompense";
    if (maxReward < minReward) return "La récompense max doit être supérieure à la min";
    return null;
  };

  const buildProgrammePayload = () => {
    const minReward = toNumber(form.minReward, 0);
    const maxReward = toNumber(form.maxReward, 0);

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      descriptionLong: form.descriptionLong.trim() || undefined,
      scope: parseList(form.scope),
      outOfScope: parseList(form.outOfScope),
      methodology: form.methodology.trim() || undefined,
      terms: parseList(form.terms),
      disclosurePolicy: form.disclosurePolicy.trim() || undefined,
      communicationChannels: parseList(form.communicationChannels),
      tags: parseList(form.tags),
      sector: form.sector.trim() || undefined,
      website: form.website.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      programType: form.programType,
      rewardCurrency: form.rewardCurrency,
      minReward,
      maxReward,
      rewardTiers: buildRewardTiers(),
      triageTimeHours: toNumber(form.triageTimeHours, 24),
      firstResponseHours: toNumber(form.firstResponseHours, 12),
      resolutionDays: toNumber(form.resolutionDays, 21),
      status: "actif" as const,
      isNew: true,
    };
  };

  const handleAdd = async () => {
    const error = validateCoreFields();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      await createProgramme.mutateAsync(buildProgrammePayload());
      toast.success("Programme détaillé créé");
      resetForm();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const startEdit = (programme: Programme) => {
    setEditing(programme.id);
    setShowAdd(false);
    const rewardTiers = programme.rewardTiers || [];

    setForm({
      name: programme.name,
      description: programme.description,
      descriptionLong: programme.descriptionLong || "",
      scope: formatList(programme.scope),
      outOfScope: formatList(programme.outOfScope),
      methodology: programme.methodology || "",
      terms: formatList(programme.terms),
      disclosurePolicy: programme.disclosurePolicy || "",
      communicationChannels: formatList(programme.communicationChannels),
      tags: (programme.tags || []).join(", "),
      sector: programme.sector || "",
      website: programme.website || "",
      logoUrl: programme.logoUrl || "",
      programType: programme.programType || "public",
      rewardCurrency: programme.rewardCurrency || "XAF",
      minReward: String(programme.minReward),
      maxReward: String(programme.maxReward),
      critMin: String(rewardTiers.find((tier) => tier.severity === "critique")?.min || ""),
      critMax: String(rewardTiers.find((tier) => tier.severity === "critique")?.max || ""),
      highMin: String(rewardTiers.find((tier) => tier.severity === "haute")?.min || ""),
      highMax: String(rewardTiers.find((tier) => tier.severity === "haute")?.max || ""),
      medMin: String(rewardTiers.find((tier) => tier.severity === "moyenne")?.min || ""),
      medMax: String(rewardTiers.find((tier) => tier.severity === "moyenne")?.max || ""),
      lowMin: String(rewardTiers.find((tier) => tier.severity === "faible")?.min || ""),
      lowMax: String(rewardTiers.find((tier) => tier.severity === "faible")?.max || ""),
      triageTimeHours: String(programme.triageTimeHours || 24),
      firstResponseHours: String(programme.firstResponseHours || 12),
      resolutionDays: String(programme.resolutionDays || 21),
    });
  };

  const handleUpdate = async (id: string) => {
    const error = validateCoreFields();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      await updateProgramme.mutateAsync({ id, data: buildProgrammePayload() });
      toast.success("Programme mis à jour");
      resetForm();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-foreground">Mes programmes</h1>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nouveau programme
          </Button>
        </div>

        {(showAdd || editing) && (
          <div className="glass-card rounded-xl p-5 border-glow space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">{editing ? "Modifier" : "Nouveau"} programme détaillé</h3>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Nom du programme *" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Secteur (Finance, Gouvernement...)" value={form.sector} onChange={(event) => setForm((prev) => ({ ...prev, sector: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Site web (https://...)" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Logo URL (optionnel)" value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Description courte *" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="bg-secondary border-border md:col-span-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea placeholder="Description détaillée" value={form.descriptionLong} onChange={(event) => setForm((prev) => ({ ...prev, descriptionLong: event.target.value }))} className="bg-secondary border-border min-h-[120px]" />
              <Textarea placeholder="Méthodologie de test (une ligne par règle)" value={form.methodology} onChange={(event) => setForm((prev) => ({ ...prev, methodology: event.target.value }))} className="bg-secondary border-border min-h-[120px]" />
              <Textarea placeholder="Scope (un domaine par ligne) *" value={form.scope} onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))} className="bg-secondary border-border min-h-[120px]" />
              <Textarea placeholder="Hors scope (une ligne par entrée)" value={form.outOfScope} onChange={(event) => setForm((prev) => ({ ...prev, outOfScope: event.target.value }))} className="bg-secondary border-border min-h-[120px]" />
              <Textarea placeholder="Termes et conditions (une ligne par règle)" value={form.terms} onChange={(event) => setForm((prev) => ({ ...prev, terms: event.target.value }))} className="bg-secondary border-border min-h-[110px]" />
              <Textarea placeholder="Canaux de communication (email, support...)" value={form.communicationChannels} onChange={(event) => setForm((prev) => ({ ...prev, communicationChannels: event.target.value }))} className="bg-secondary border-border min-h-[110px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={form.programType} onChange={(event) => setForm((prev) => ({ ...prev, programType: event.target.value as ProgrammeForm["programType"] }))} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="public">Public</option>
                <option value="private">Privé</option>
                <option value="vdp">VDP</option>
              </select>
              <select value={form.rewardCurrency} onChange={(event) => setForm((prev) => ({ ...prev, rewardCurrency: event.target.value as ProgrammeForm["rewardCurrency"] }))} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="XAF">XAF</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <Input placeholder="Tags (API, Web, Mobile...)" value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Récompense min *" value={form.minReward} onChange={(event) => setForm((prev) => ({ ...prev, minReward: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Récompense max *" value={form.maxReward} onChange={(event) => setForm((prev) => ({ ...prev, maxReward: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Politique de divulgation" value={form.disclosurePolicy} onChange={(event) => setForm((prev) => ({ ...prev, disclosurePolicy: event.target.value }))} className="bg-secondary border-border" />
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground font-mono">Tiers de récompense par sévérité (optionnel)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input placeholder="Critique min" value={form.critMin} onChange={(event) => setForm((prev) => ({ ...prev, critMin: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Critique max" value={form.critMax} onChange={(event) => setForm((prev) => ({ ...prev, critMax: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Haute min" value={form.highMin} onChange={(event) => setForm((prev) => ({ ...prev, highMin: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Haute max" value={form.highMax} onChange={(event) => setForm((prev) => ({ ...prev, highMax: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Moyenne min" value={form.medMin} onChange={(event) => setForm((prev) => ({ ...prev, medMin: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Moyenne max" value={form.medMax} onChange={(event) => setForm((prev) => ({ ...prev, medMax: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Faible min" value={form.lowMin} onChange={(event) => setForm((prev) => ({ ...prev, lowMin: event.target.value }))} className="bg-secondary border-border" />
                <Input placeholder="Faible max" value={form.lowMax} onChange={(event) => setForm((prev) => ({ ...prev, lowMax: event.target.value }))} className="bg-secondary border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Triage (heures)" value={form.triageTimeHours} onChange={(event) => setForm((prev) => ({ ...prev, triageTimeHours: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="1re réponse (heures)" value={form.firstResponseHours} onChange={(event) => setForm((prev) => ({ ...prev, firstResponseHours: event.target.value }))} className="bg-secondary border-border" />
              <Input placeholder="Résolution (jours)" value={form.resolutionDays} onChange={(event) => setForm((prev) => ({ ...prev, resolutionDays: event.target.value }))} className="bg-secondary border-border" />
            </div>

            <Button size="sm" onClick={() => (editing ? handleUpdate(editing) : handleAdd())}>
              <Save className="w-4 h-4 mr-1" /> {editing ? "Sauvegarder" : "Créer"}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {myProgrammes.map((programme) => (
            <div key={programme.id} className="glass-card rounded-lg p-4 border-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{programme.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusBadgeClass(programme.status)}`}>{programme.status}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {programme.minReward.toLocaleString()} - {programme.maxReward.toLocaleString()} {programme.rewardCurrency || "FCFA"} · {programme.reportsCount} rapports
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/programmes/${programme.id}`}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Voir
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => startEdit(programme)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                {programme.status === "actif" ? (
                  <Button variant="outline" size="sm" onClick={() => { updateProgramme.mutate({ id: programme.id, data: { status: "pause" } }); toast.info("Mis en pause"); }}>
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { updateProgramme.mutate({ id: programme.id, data: { status: "actif" } }); toast.success("Activé"); }}>
                    Activer
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => { deleteProgramme.mutate(programme.id); toast.error("Supprimé"); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {myProgrammes.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun programme créé</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
