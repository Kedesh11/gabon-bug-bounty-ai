import { supabaseAdmin } from "./supabaseAdmin.js";
import { HttpError } from "../middleware/errorHandler.js";

const ensured = new Set<string>();

export interface BucketOptions {
  fileSizeLimit: string;
  allowedMimeTypes: string[];
}

// Local dev / self-hosted Supabase has no migration mechanism for Storage buckets —
// unlike Postgres tables there's no `supabase/migrations` equivalent, so a bucket is
// created lazily and idempotently on first use instead. Cached in-process (per bucket)
// since listBuckets() is a network round-trip and a created bucket never goes away.
// Always private: every download goes through a short-lived signed URL.
export async function ensureBucket(name: string, options: BucketOptions) {
  if (ensured.has(name)) return;
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw new HttpError(500, `Impossible de vérifier le bucket de stockage: ${error.message}`);

  if (!buckets?.some((b) => b.name === name)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(name, { public: false, ...options });
    // Ignore a race where another request created it in between the check and here.
    if (createError && !createError.message.includes("already exists")) {
      throw new HttpError(500, `Impossible de créer le bucket de stockage: ${createError.message}`);
    }
  }
  ensured.add(name);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}
