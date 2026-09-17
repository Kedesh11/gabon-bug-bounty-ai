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

export interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

// Same never-throws contract as sendStaffCredentialsEmail: a delivery failure must
// never surface as a 500 to the caller, since /forgot-password always returns 200
// regardless of whether the account exists, let alone whether the email sent.
export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, error: "Resend non configuré (RESEND_API_KEY manquant) — voir api/.env.example" };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: "Réinitialisation de votre mot de passe — Gabon Bug Bounty",
      html: renderPasswordResetEmailHtml(input),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erreur d'envoi inconnue" };
  }
}

function renderPasswordResetEmailHtml(input: PasswordResetEmailInput): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Réinitialisation de mot de passe</h2>
      <p>Vous avez demandé à réinitialiser votre mot de passe sur Gabon Bug Bounty.</p>
      <p><a href="${escapeHtml(input.resetUrl)}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
  `;
}

export interface VerificationEmailInput {
  to: string;
  verifyUrl: string;
}

// Same never-throws contract as the other two — a failed send must never block
// registration itself (see POST /api/auth/register), only degrade emailSent in the response.
export async function sendVerificationEmail(input: VerificationEmailInput): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, error: "Resend non configuré (RESEND_API_KEY manquant) — voir api/.env.example" };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: "Confirmez votre email — Gabon Bug Bounty",
      html: renderVerificationEmailHtml(input),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erreur d'envoi inconnue" };
  }
}

function renderVerificationEmailHtml(input: VerificationEmailInput): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Confirmez votre adresse email</h2>
      <p>Bienvenue sur Gabon Bug Bounty ! Confirmez votre adresse email pour activer votre compte.</p>
      <p><a href="${escapeHtml(input.verifyUrl)}">Cliquez ici pour confirmer votre email</a></p>
      <p>Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
    </div>
  `;
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
