import { Resend } from "resend";
import { env } from "../env.js";

export interface StaffCredentialsEmailInput {
  to: string;
  roleLabel: string;
  email: string;
  password: string;
  message?: string;
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

// Never throws — a failed email must never block role/account provisioning, which
// already succeeded by the time this is called. The caller surfaces `sent`/`error`
// to the admin so credentials can be transmitted manually if delivery failed.
export async function sendStaffCredentialsEmail(input: StaffCredentialsEmailInput): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, error: "Resend non configuré (RESEND_API_KEY manquant) — voir api/.env.example" };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: "Votre accès à la plateforme Gabon Bug Bounty",
      html: renderEmailHtml(input),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erreur d'envoi inconnue" };
  }
}

function renderEmailHtml(input: StaffCredentialsEmailInput): string {
  const messageBlock = input.message
    ? `<p><strong>Message de l'administrateur :</strong></p><p>${escapeHtml(input.message)}</p>`
    : "";

  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Bienvenue sur Gabon Bug Bounty</h2>
      <p>Un compte vous a été créé avec le rôle <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
      <p><strong>Email de connexion :</strong> ${escapeHtml(input.email)}</p>
      <p><strong>Mot de passe temporaire :</strong> ${escapeHtml(input.password)}</p>
      ${messageBlock}
      <p>Connectez-vous sur la plateforme avec ces identifiants.</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
