import { toast } from "sonner";

// A staff account is created with no known password; the person sets their own through a
// one-time link that is normally emailed. When the email could not be sent (e.g. Resend not
// configured) the API hands the link back so the admin can pass it on — shown once, with a
// copy action, instead of ever transmitting a password.
export function notifyStaffInvitation(
  who: string,
  result: { emailSent: boolean; setPasswordUrl?: string },
  verb: "créé" | "ajouté à l'équipe",
) {
  if (result.emailSent) {
    toast.success(`${who} a été ${verb}, invitation envoyée par email`);
    return;
  }
  toast.warning(`${who} a été ${verb}, mais l'email n'a pas pu être envoyé — transmettez-lui le lien d'activation (valable 72 h).`, {
    duration: Infinity,
    closeButton: true,
    action: result.setPasswordUrl
      ? {
          label: "Copier le lien",
          onClick: () => {
            navigator.clipboard?.writeText(result.setPasswordUrl as string).then(
              () => toast.success("Lien copié"),
              () => toast.error("Copie impossible — rouvrez la notification et sélectionnez le lien manuellement"),
            );
          },
        }
      : undefined,
  });
}
