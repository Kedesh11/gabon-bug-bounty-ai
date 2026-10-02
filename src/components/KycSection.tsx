import { useRef } from "react";
import { FileText, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyKycDocuments, useUploadKycDocument, openKycFile, type KycDocumentStatus, type KycDocumentType } from "@/hooks/api/kyc";
import { apiErrorMessage } from "@/lib/apiClient";

const TYPES: { type: KycDocumentType; label: string }[] = [
  { type: "passeport_recto", label: "Passeport (recto)" },
  { type: "passeport_verso", label: "Passeport (verso)" },
  { type: "justificatif_domicile", label: "Justificatif de domicile" },
  { type: "photo_identite", label: "Photo d'identité" },
];

const STATUS_LABEL: Record<KycDocumentStatus, string> = { en_attente: "En attente", valide: "Validé", rejete: "Rejeté" };
const STATUS_CLASS: Record<KycDocumentStatus, string> = {
  en_attente: "bg-orange-500 text-white",
  valide: "bg-green-500 text-white",
  rejete: "bg-destructive text-white",
};

const MAX_BYTES = 5 * 1024 * 1024;

// Self-contained like MfaSection: any role's paramètres page can drop it in.
export function KycSection() {
  const { data: documents = [] } = useMyKycDocuments();
  const upload = useUploadKycDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<KycDocumentType | null>(null);

  const choose = (type: KycDocumentType) => {
    pendingType.current = type;
    inputRef.current?.click();
  };

  const onFile = (file: File | undefined) => {
    const type = pendingType.current;
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !type) return;
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop volumineux (5 Mo maximum)");
      return;
    }
    upload.mutate(
      { type, file },
      {
        onSuccess: () => toast.success("Document envoyé, en attente de vérification"),
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <div className="glass-card rounded-2xl border border-border p-8 space-y-6">
      <div>
        <h3 className="text-lg font-black tracking-tight">Vérification d'identité (KYC)</h3>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPEG ou PNG, 5 Mo maximum. Renvoyer un document remplace le précédent.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div className="space-y-3">
        {TYPES.map(({ type, label }) => {
          const doc = documents.find((d) => d.type === type);
          return (
            <div key={type} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{label}</p>
                  {doc?.fileName && <p className="text-[10px] text-muted-foreground truncate">{doc.fileName}</p>}
                  {doc?.status === "rejete" && doc.reviewNote && <p className="text-[10px] text-destructive">{doc.reviewNote}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc && <Badge className={`text-[8px] font-black uppercase ${STATUS_CLASS[doc.status]}`}>{STATUS_LABEL[doc.status]}</Badge>}
                {doc?.hasFile && (
                  <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => openKycFile(doc.id)} aria-label="Voir le document">
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1 font-bold" disabled={upload.isPending} onClick={() => choose(type)}>
                  <Upload className="w-4 h-4" /> {doc ? "Remplacer" : "Envoyer"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
