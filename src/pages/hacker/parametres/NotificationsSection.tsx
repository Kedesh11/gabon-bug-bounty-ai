import { Save, Send, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "./types";

interface NotificationsSectionProps {
  preferences: NotificationPreferences;
  setPreference: <K extends keyof NotificationPreferences>(field: K, value: NotificationPreferences[K]) => void;
  onSave: () => void;
  onSendTest: () => void;
}

export function NotificationsSection({ preferences, setPreference, onSave, onSendTest }: NotificationsSectionProps) {
  return (
    <div className="glass-card rounded-xl p-5 border-glow space-y-4">
      <div className="flex items-center gap-3">
        <BellRing className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Notifications in-app</span>
          <Switch checked={preferences.inAppEnabled} onCheckedChange={(value) => setPreference("inAppEnabled", value)} />
        </div>
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Notifications email</span>
          <Switch checked={preferences.emailEnabled} onCheckedChange={(value) => setPreference("emailEnabled", value)} />
        </div>
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Alertes paiement</span>
          <Switch checked={preferences.paymentAlerts} onCheckedChange={(value) => setPreference("paymentAlerts", value)} />
        </div>
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground">Statut des rapports</span>
          <Switch checked={preferences.reportStatusAlerts} onCheckedChange={(value) => setPreference("reportStatusAlerts", value)} />
        </div>
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 flex items-center justify-between md:col-span-2">
          <span className="text-sm text-foreground">Alertes sécurité</span>
          <Switch checked={preferences.securityAlerts} onCheckedChange={(value) => setPreference("securityAlerts", value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer notifications
        </Button>
        <Button onClick={onSendTest} variant="secondary">
          <Send className="w-4 h-4 mr-2" />
          Envoyer un test
        </Button>
      </div>
    </div>
  );
}
