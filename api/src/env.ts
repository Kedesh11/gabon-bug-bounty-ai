import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  // This API's own publicly reachable base URL, used to build webhook/notify_url
  // callbacks for providers (e.g. CinetPay's notify_url). In local dev, expose
  // the API with a tunnel (ngrok, `stripe listen` handles Stripe separately) and
  // point this at that tunnel URL.
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:8080"),

  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  // Empty until the first `stripe listen` session; webhook route rejects requests until it's set.
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  // Optional until a real CinetPay merchant account is available; the CinetPay
  // sub-service throws a clear error at call time if these are missing.
  CINETPAY_API_KEY: z.string().optional().default(""),
  CINETPAY_SITE_ID: z.string().optional().default(""),
  CINETPAY_TRANSFER_LOGIN: z.string().optional().default(""),
  CINETPAY_TRANSFER_PASSWORD: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
