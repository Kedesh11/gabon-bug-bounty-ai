import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const REPORT_ATTACHMENTS_BUCKET = "report-attachments";

let bucketEnsured = false;

// Local dev / self-hosted Supabase has no migration mechanism for Storage buckets —
// unlike Postgres tables there's no `supabase/migrations` equivalent, so the bucket
// is created lazily and idempotently on first use instead. Cached in-process since
// listBuckets() is a network round-trip and the bucket, once created, never goes away.
async function ensureBucket() {
  if (bucketEnsured) return;
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw new HttpError(500, `Impossible de vérifier le bucket de stockage: ${error.message}`);

  if (!buckets?.some((b) => b.name === REPORT_ATTACHMENTS_BUCKET)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(REPORT_ATTACHMENTS_BUCKET, {
      public: false,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["application/pdf"],
    });
    // Ignore a race where another request created it in between the check and here.
    if (createError && !createError.message.includes("already exists")) {
      throw new HttpError(500, `Impossible de créer le bucket de stockage: ${createError.message}`);
    }
  }
  bucketEnsured = true;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function uploadReportPdf(
  reportId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<{ path: string }> {
  if (file.mimetype !== "application/pdf") {
    throw new HttpError(400, "Le fichier joint doit être un PDF");
  }

  await ensureBucket();

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
