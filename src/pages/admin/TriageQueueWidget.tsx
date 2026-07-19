import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ShieldAlert, ChevronLeft, ChevronRight, LayoutList, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Report } from "@/types/domain";

const SEVERITY_RANK: Record<Report["severity"], number> = {
  critique: 0,
  haute: 1,
  moyenne: 2,
  faible: 3,
  info: 4,
};

const SEVERITY_BADGE: Record<Report["severity"], string> = {
  critique: "bg-destructive text-destructive-foreground",
  haute: "bg-orange-500 text-white",
  moyenne: "bg-yellow-500 text-black",
  faible: "bg-blue-500 text-white",
  info: "bg-secondary text-foreground",
};

const LIST_PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

export function TriageQueueWidget({ reports }: { reports: Report[] }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [page, setPage] = useState(0);

  // "Priorité IA": most severe first, then most recent — not just insertion order.
  const queue = useMemo(
    () =>
      reports
        .filter(r => r.status === "soumis" || r.status === "en_analyse")
        .sort(
          (a, b) =>
            SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [reports],
  );

  const pageSize = viewMode === "list" ? LIST_PAGE_SIZE : CARD_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(queue.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = queue.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const changeViewMode = (mode: string) => {
    if (mode !== "list" && mode !== "card") return;
    setViewMode(mode);
    setPage(0);
  };

  const openReport = (id: string) => navigate(`/admin/rapports?id=${id}`);

  return (
    <div className="glass-card rounded-2xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" /> File de Triage Global (Priorité IA)
        </h3>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={changeViewMode}
            className="bg-secondary/50 rounded-lg p-0.5 gap-0"
          >
            <ToggleGroupItem value="list" size="sm" className="h-7 w-7 data-[state=on]:bg-background" aria-label="Vue liste">
              <LayoutList className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="card" size="sm" className="h-7 w-7 data-[state=on]:bg-background" aria-label="Vue cartes">
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7" onClick={() => navigate("/admin/rapports")}>
            GÉRER LA FILE
          </Button>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Aucun rapport en attente de triage.</p>
      ) : viewMode === "list" ? (
        <div className="divide-y divide-border">
          {pageItems.map(r => (
            <button
              key={r.id}
              onClick={() => openReport(r.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors group text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  r.severity === "critique" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">{r.hackerName} ➜ {r.programmeName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Badge className={SEVERITY_BADGE[r.severity]}>{r.severity.toUpperCase()}</Badge>
                <div className="h-8 w-8 rounded-full border border-border group-hover:border-primary/50 transition-all flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {pageItems.map(r => (
            <button
              key={r.id}
              onClick={() => openReport(r.id)}
              className="text-left glass-card rounded-xl border border-border p-4 hover:border-primary/40 transition-all group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  r.severity === "critique" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <Badge className={SEVERITY_BADGE[r.severity]}>{r.severity.toUpperCase()}</Badge>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{r.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black truncate">{r.hackerName} ➜ {r.programmeName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {queue.length > pageSize && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="text-[10px] font-bold"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
          <span className="text-[10px] font-black uppercase text-muted-foreground">
            Page {currentPage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="text-[10px] font-bold"
          >
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
