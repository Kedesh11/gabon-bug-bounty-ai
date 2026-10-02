import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { ensureBucket, sanitizeFilename } from "../../lib/storageBucket.js";

export const REPORT_ATTACHMENTS_BUCKET = "report-attachments";

const bucketOptions = { fileSizeLimit: "10MB", allowedMimeTypes: ["application/pdf"] };

export async function uploadReportPdf(
  reportId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<{ path: string }> {
  if (file.mimetype !== "application/pdf") {
    throw new HttpError(400, "Le fichier joint doit être un PDF");
  }

  await ensureBucket(REPORT_ATTACHMENTS_BUCKET, bucketOptions);

  const path = `${reportId}/${Date.now()}-${sanitizeFilename(file.originalname)}`;
  const { error } = await supabaseAdmin.storage
    .from(REPORT_ATTACHMENTS_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  if (error) throw new HttpError(500, `Échec de l'upload du PDF: ${error.message}`);

  return { path };
}

export async function getSignedReportPdfUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(REPORT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new HttpError(500, `Impossible de générer le lien de téléchargement: ${error?.message}`);
  return data.signedUrl;
}
