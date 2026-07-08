import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import {
  Search,
  Download,
  ShieldAlert,
  Activity,
  User,
  Clock,
  ShieldCheck,
  Database,
  Lock,
  Globe,
  Zap,
  Copy,
  RefreshCw,
  Eye,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { PlatformLog } from "@/stores/dataStore";
import { toast } from "sonner";

export default function AdminLogs() {
  const { logs } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [selectedLog, setSelectedLog] = useState<PlatformLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (typeof log.metadata?.ip === "string" && log.metadata.ip.includes(searchTerm));
      const matchesType = filterType === "Tous" || log.type === filterType.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, filterType]);

  const siemStats = {
    total: logs.length,
    security: logs.filter(l => l.type === "security").length,
    critical: logs.filter(l => l.level === "critical").length,
    warning: logs.filter(l => l.level === "warning").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        {/* SIEM Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-2">
                Cyber-SIEM™ <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">LIVE</Badge>
              </h1>
              <p className="text-muted-foreground font-medium text-sm">Système de Gestion des Informations et des Événements de Sécurité.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2 mr-4">
              <div className="text-right">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">EPS (Events Per Sec)</p>
                <p className="text-xl font-black text-primary">124.5</p>
              </div>
              <div className="h-8 w-[1px] bg-border mx-2" />
              <div className="text-right">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Retention</p>
                <p className="text-xl font-black text-foreground">90 Jours</p>
              </div>
            </div>
            <Button variant="outline" className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-border hover:bg-secondary">
              <Download className="w-4 h-4 mr-2" /> Rapport Compliance
            </Button>
            <Button className="h-12 px-8 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
              <RefreshCw className="w-4 h-4 mr-2" /> ACTUALISER
            </Button>
          </div>
        </div>

        {/* SIEM Dashboard Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SiemWidget icon={<Lock className="w-5 h-5" />} label="Menaces Détectées" value={siemStats.critical.toString()} color="destructive" trend="+2" />
          <SiemWidget icon={<Globe className="w-5 h-5" />} label="Origines Uniques" value="12" color="blue" trend="-5%" />
          <SiemWidget icon={<Database className="w-5 h-5" />} label="Volume Data" value="1.2 TB" color="green" trend="+12%" />
          <SiemWidget icon={<Activity className="w-5 h-5" />} label="Indice de Risque" value="Low" color="primary" trend="Stable" />
        </div>

        {/* Timeline Histogram (Mock) */}
        <Card className="glass-card p-8 rounded-[32px] border-border bg-gradient-to-br from-secondary/30 to-transparent">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Timeline des Événements (24h)
            </h3>
            <div className="flex gap-2">
              <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black">SPIKE DETECTED</Badge>
              <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black">AUTO-RESOLUTION ACTIVE</Badge>
            </div>
          </div>
          <div className="flex items-end justify-between h-32 gap-1.5">
            {[30, 45, 25, 60, 40, 85, 30, 50, 40, 70, 95, 60, 45, 30, 55, 75, 40, 30, 20, 40, 60, 45, 50, 35].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/10 rounded-t-lg relative group cursor-pointer">
                <div 
                  style={{ height: `${h}%` }} 
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${
                    h > 80 ? "bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]" : 
                    h > 60 ? "bg-orange-500" : "bg-primary"
                  } group-hover:brightness-125`}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border px-2 py-1 rounded text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {h} Evts
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest border-t border-border/50 pt-4">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </Card>

        {/* SIEM Control Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Logs Stream */}
          <div className="lg:col-span-12 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Filtrage SIEM: source:AuthService level:critical message:password..." 
                  className="pl-12 h-14 bg-secondary/30 border-border rounded-[20px] font-bold focus:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-[20px] border border-border w-full md:w-auto overflow-x-auto">
                {["Tous", "Security", "Performance", "System", "User_Action"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      filterType === t ? "bg-background text-primary shadow-lg border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Card className="glass-card rounded-[32px] border-border overflow-hidden shadow-2xl relative">
              <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Flux d'Événements Consolidé</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-black border-border px-3 py-1">REAL-TIME INGESTION ON</Badge>
                </div>
              </div>
              
              <div className="p-0">
                <ScrollArea className="h-[600px] w-full">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead className="bg-secondary/50 sticky top-0 z-10 border-b border-border">
                      <tr>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground w-40">Horodatage</th>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground w-32">Type</th>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground w-40">Source</th>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground">Message</th>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground w-20">Sévérité</th>
                        <th className="p-4 text-[10px] font-black uppercase text-muted-foreground w-16 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors group cursor-pointer" onClick={() => setSelectedLog(log)}>
                          <td className="p-4 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <Badge className={`text-[8px] font-black uppercase px-2 h-5 ${
                              log.type === "security" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              log.type === "performance" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                              "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            }`}>
                              {log.type}
                            </Badge>
                          </td>
                          <td className="p-4 text-[11px] font-bold text-foreground">
                            {log.source}
                          </td>
                          <td className="p-4 text-[11px] font-medium text-muted-foreground truncate max-w-md">
                            {log.message}
                          </td>
                          <td className="p-4">
                             <div className={`h-2.5 w-2.5 rounded-full mx-auto ${
                              log.level === "critical" ? "bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" :
                              log.level === "error" ? "bg-destructive" :
                              log.level === "warning" ? "bg-orange-500" :
                              "bg-blue-500"
                            }`} />
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/10 group-hover:text-primary">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLogs.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                      <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                      <p className="text-lg font-bold text-muted-foreground uppercase tracking-widest">Zero Intelligence Found</p>
                      <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterType("Tous"); }} className="rounded-xl font-black text-[10px] uppercase border-border">
                        Réinitialiser l'Audit
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </Card>
          </div>
        </div>

        {/* Log Detail Modal (SIEM Style) */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-4xl bg-card border-border rounded-[32px] shadow-2xl p-0 overflow-hidden gap-0 font-mono">
            {selectedLog && (
              <div className="flex flex-col h-[80vh]">
                <div className={`h-1.5 w-full ${
                  selectedLog.level === "critical" ? "bg-destructive animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" :
                  selectedLog.level === "error" ? "bg-destructive" :
                  selectedLog.level === "warning" ? "bg-orange-500" :
                  "bg-blue-500"
                }`} />
                
                <div className="p-8 flex-1 overflow-auto space-y-8">
                  <DialogHeader className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest">
                          EVENT ID: {selectedLog.id}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-black px-4 py-1.5 rounded-full border-border">
                          VERDICT: {selectedLog.level.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase">
                        <Clock className="w-4 h-4" />
                        {new Date(selectedLog.timestamp).toISOString()}
                      </div>
                    </div>
                    <DialogTitle className="text-3xl font-black tracking-tighter leading-tight text-foreground bg-secondary/30 p-6 rounded-[24px] border border-border">
                      {selectedLog.message}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <LogDetailBox icon={<Zap className="w-4 h-4" />} label="Source Service" value={selectedLog.source} />
                    <LogDetailBox icon={<User className="w-4 h-4" />} label="User Identity" value={selectedLog.userId || "N/A"} />
                    <LogDetailBox icon={<Activity className="w-4 h-4" />} label="Event Type" value={selectedLog.type.toUpperCase()} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" /> Payload & Context JSON
                      </p>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase gap-2 hover:text-primary" onClick={() => {
                         navigator.clipboard.writeText(JSON.stringify(selectedLog.metadata, null, 2));
                         toast.success("JSON copié");
                      }}>
                        <Copy className="w-3 h-3" /> Copier
                      </Button>
                    </div>
                    <div className="p-8 rounded-[32px] bg-black/50 border border-white/5 text-[11px] text-blue-400 overflow-auto max-h-[400px] shadow-2xl relative">
                       <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500/50 blur-[2px] animate-pulse" />
                       <pre className="leading-relaxed">
                        {JSON.stringify(selectedLog.metadata || { info: "No supplementary payload" }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex items-center gap-4">
                    <Button variant="outline" className="h-14 rounded-2xl flex-1 font-black uppercase tracking-widest text-[10px] border-border hover:bg-background">
                      <Lock className="w-4 h-4 mr-2 text-destructive" /> Bloquer l'IP / Source
                    </Button>
                    <Button className="h-14 rounded-2xl flex-1 font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Acquitter l'Événement
                    </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function SiemWidget({ icon, label, value, color, trend }: { icon: React.ReactNode, label: string, value: string, color: string, trend: string }) {
  const colorMap: Record<string, string> = {
    destructive: "bg-destructive/10 text-destructive border-destructive/20 shadow-destructive/5",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
    green: "bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5",
    primary: "bg-primary/10 text-primary border-primary/20 shadow-primary/5",
  };

  return (
    <Card className={`glass-card p-6 border flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-2xl ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center border border-inherit">
          {icon}
        </div>
        <span className={`text-[9px] font-black px-2 py-1 rounded-full bg-background/50 border border-inherit ${
          trend.startsWith("+") ? "text-green-500" : trend.startsWith("-") ? "text-destructive" : "text-muted-foreground"
        }`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">{label}</p>
        <p className="text-3xl font-black tracking-tighter">{value}</p>
      </div>
    </Card>
  );
}

function LogDetailBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-6 rounded-[24px] bg-secondary/30 border border-border space-y-2 group hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-base font-black text-foreground truncate group-hover:text-primary transition-colors">{value}</p>
    </div>
  );
}
