import { CreditCard, Smartphone, Send, Bot, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import type { useIntegrations } from "./useIntegrations";
import { useContent } from "@/hooks/api/content";

type IntegrationsState = ReturnType<typeof useIntegrations>;

const INTEGRATION_DEFS = [
  { key: "stripe" as const, title: "Stripe", desc: "Paiements par carte pour le financement des programmes.", icon: CreditCard, envVars: "STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET" },
  { key: "cinetpayCheckout" as const, title: "CinetPay Checkout", desc: "Mobile Money pour le financement des programmes.", icon: Smartphone, envVars: "CINETPAY_API_KEY / CINETPAY_SITE_ID" },
  { key: "cinetpayTransfer" as const, title: "CinetPay Transfer", desc: "Versements Mobile Money aux hackers.", icon: Send, envVars: "CINETPAY_TRANSFER_LOGIN / CINETPAY_TRANSFER_PASSWORD" },
  { key: "openrouter" as const, title: "OpenRouter (agents MCP)", desc: "Analyse automatique des rapports soumis.", icon: Bot, envVars: "OPENROUTER_API_KEY" },
  { key: "resend" as const, title: "Resend", desc: "Envoi des identifiants aux nouveaux comptes staff.", icon: Mail, envVars: "RESEND_API_KEY" },
];

export function IntegrationsTab({ data: status, isLoading }: IntegrationsState) {
  const heading = useContent("admin.parametres.integrations.heading", "Intégrations");
  const subheading = useContent(
    "admin.parametres.integrations.subheading",
    "État réel des services externes configurés — à définir dans api/.env, aucune clé n'est modifiable ici.",
  );

  return (
    <TabsContent value="integrations" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h3 className="text-lg font-black tracking-tight">{heading}</h3>
        <p className="text-xs text-muted-foreground mt-1">{subheading}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATION_DEFS.map((def) => {
          const configured = status?.[def.key] ?? false;
          const Icon = def.icon;
          return (
            <div key={def.key} className="glass-card rounded-2xl border border-border p-6 flex items-start gap-4">
              <div className="shrink-0"><Icon className="w-8 h-8 text-primary" /></div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-sm tracking-tight">{def.title}</h4>
                  {!isLoading && (
                    <Badge className={configured ? "bg-green-500/10 text-green-500" : "bg-secondary text-muted-foreground"}>
                      {configured ? "CONFIGURÉ" : "NON CONFIGURÉ"}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{def.desc}</p>
                {!configured && (
                  <p className="text-[10px] text-muted-foreground font-mono pt-1">{def.envVars}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TabsContent>
  );
}
