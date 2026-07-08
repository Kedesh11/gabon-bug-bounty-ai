import { useState } from "react";
import { toast } from "sonner";
import { Slack, MessageSquare, Mail, Key } from "lucide-react";
import type { Integration } from "./types";

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "slack", title: "Slack Webhooks", desc: "Envoyez des alertes en temps réel sur vos canaux de sécurité.", icon: <Slack className="w-8 h-8 text-[#4A154B]" />, connected: false },
  { id: "discord", title: "Discord Integration", desc: "Notifier la communauté des nouveaux programmes publics.", icon: <MessageSquare className="w-8 h-8 text-[#5865F2]" />, connected: true },
  { id: "google_smtp", title: "Google SMTP Relay", desc: "Service d'envoi d'emails sécurisé via Google Workspace.", icon: <Mail className="w-8 h-8 text-primary" />, connected: true },
  { id: "api", title: "API Access", desc: "Générer des clés d'accès pour l'automatisation externe.", icon: <Key className="w-8 h-8 text-accent" />, connected: false },
];

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const [slackUrl, setSlackUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [googleSmtpUser, setGoogleSmtpUser] = useState("");
  const [googleSmtpPass, setGoogleSmtpPass] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigOpen(true);
  };

  const handleConnect = () => {
    if (!selectedIntegration) return;

    const promise = new Promise((resolve) => setTimeout(resolve, 1500));
    toast.promise(promise, {
      loading: "Connexion au service...",
      success: () => {
        setIntegrations(prev => prev.map(i => i.id === selectedIntegration.id ? { ...i, connected: true } : i));
        setConfigOpen(false);
        return `${selectedIntegration.title} connecté avec succès`;
      },
      error: "Erreur lors de la connexion",
    });
  };

  const handleDisconnect = () => {
    if (!selectedIntegration) return;
    setIntegrations(prev => prev.map(i => i.id === selectedIntegration.id ? { ...i, connected: false } : i));
    setConfigOpen(false);
    toast.info(`${selectedIntegration.title} déconnecté`);
  };

  const generateApiKey = () => {
    const key = `bb_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
    toast.success("Nouvelle clé API générée");
  };

  return {
    integrations,
    configOpen,
    setConfigOpen,
    selectedIntegration,
    handleConfigure,
    handleConnect,
    handleDisconnect,
    slackUrl,
    setSlackUrl,
    discordUrl,
    setDiscordUrl,
    googleSmtpUser,
    setGoogleSmtpUser,
    googleSmtpPass,
    setGoogleSmtpPass,
    apiKey,
    generateApiKey,
  };
}
