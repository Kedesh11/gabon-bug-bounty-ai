import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

// Service-role client: server-side only, never exposed to the frontend.
// Used to create/authenticate users and to verify access tokens sent by clients.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
