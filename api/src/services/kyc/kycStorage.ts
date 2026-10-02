import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { ensureBucket, sanitizeFilename } from "../../lib/storageBucket.js";

export const KYC_BUCKET = "kyc-documents";
export const KYC_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = {
  "application/pdf": (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
} as const;

export const KYC_ALLOWED_MIME_TYPES = Object.keys(ALLOWED);

// The multipart Content-Type is client-controlled, so it is cross-checked against the
// file's real magic bytes — an identity document must be what it claims to be.
export async function uploadKycFile(
  subjectId: string,
  type: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<{ path: string }> {
  const sniff = ALLOWED[file.mimetype as keyof typeof ALLOWED];
  if (!sniff || !sniff(file.buffer)) {
    throw new HttpError(400, "Le fichier doit être un PDF, un JPEG ou un PNG valide (5 Mo max)");
  }

  await ensureBucket(KYC_BUCKET, { fileSizeLimit: "5MB", allowedMimeTypes: KYC_ALLOWED_MIME_TYPES });

  const path = `${subjectId}/${type}/${Date.now()}-${sanitizeFilename(file.originalname)}`;
  const { error } = await supabaseAdmin.storage.from(KYC_BUCKET).upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  if (error) throw new HttpError(500, `Échec de l'envoi du document: ${error.message}`);
  return { path };
}

// Short-lived: identity documents should never sit behind a long-lived link.
export async function getSignedKycUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(KYC_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new HttpError(500, `Impossible de générer le lien du document: ${error?.message}`);
  return data.signedUrl;
}
