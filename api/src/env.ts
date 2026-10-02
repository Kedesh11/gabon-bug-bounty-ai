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
  // Number of reverse-proxy hops in front of the API (1 behind a single load balancer /
  // nginx). Express's req.ip — and therefore every rate limiter — reads the proxy's address
  // instead of the caller's unless this is set. 0 (default) = API is exposed directly.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  // Session cookies (see lib/sessionCookies.ts). SameSite "lax" fits a frontend and an API on the
  // same site (same registrable domain, e.g. app.example.ga + api.example.ga, or localhost on
  // two ports); use "none" — which REQUIRES Secure — only if they are on different sites.
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  // Defaults to true in production, false otherwise (plain http on localhost).
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  COOKIE_DOMAIN: z.string().optional().default(""),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:8080"),
  // Frontend's own base URL, used to build the password-reset link emailed to a user
  // (see routes/auth.routes.ts) — distinct from CORS_ORIGIN, which is about the API's
  // access control, not link construction, even though both point at the same origin today.
  FRONTEND_URL: z.string().url().default("http://localhost:8080"),

  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  // Empty until the first `stripe listen` session; webhook route rejects requests until it's set.
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  // Optional until a real CinetPay merchant account is available; the CinetPay
  // sub-service throws a clear error at call time if these are missing.
  CINETPAY_API_KEY: z.string().optional().default(""),
  CINETPAY_SITE_ID: z.string().optional().default(""),
  CINETPAY_TRANSFER_LOGIN: z.string().optional().default(""),
  CINETPAY_TRANSFER_PASSWORD: z.string().optional().default(""),

  // Which aggregator handles mobile money (collections from entreprises, payouts to hackers).
  // PVit serves Gabon (Airtel Money, Moov Money); CinetPay does not.
  MOBILE_MONEY_PROVIDER: z.enum(["pvit", "cinetpay"]).default("pvit"),

  // PVit (https://docs.mypvit.pro). Each API has its OWN URL, copied from the merchant dashboard
  // (APIs menu) — they are configured whole rather than rebuilt, since the docs themselves are
  // inconsistent about the /v2 prefix. Optional until a merchant account exists; the PVit
  // sub-service throws a clear error at call time naming whatever is missing.
  PVIT_OPERATION_ACCOUNT_CODE: z.string().optional().default(""), // ACC_xxx, the settlement account
  PVIT_SECRET_PASSWORD: z.string().optional().default(""), // password set for the Renew Secret API
  PVIT_RENEW_SECRET_URL: z.string().optional().default(""),
  PVIT_PAYMENT_URL: z.string().optional().default(""), // the REST payment API (PAYMENT and GIVE_CHANGE)
  PVIT_STATUS_URL: z.string().optional().default(""),
  PVIT_BALANCE_URL: z.string().optional().default(""), // optional: enables the pre-payout balance check
  PVIT_CALLBACK_URL_CODE: z.string().optional().default(""), // code of the Callback URL (max 12 chars)
  // Optional comma-separated source IPs allowed to call /api/webhooks/pvit (PVit publishes its
  // addresses). Needs TRUST_PROXY_HOPS right behind a proxy. Callbacks are re-verified against
  // PVit's status API regardless, so this is defence in depth, not the authentication.
  PVIT_CALLBACK_IP_ALLOWLIST: z.string().optional().default(""),

  // Optional until a real OpenRouter account is available; the MCP agents pipeline
  // throws a clear error at call time if this is missing (see mcpAgents/openRouterClient.ts).
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1/chat/completions"),
  // Sent as the HTTP-Referer header OpenRouter recommends for analytics/rate-limit attribution.
  OPENROUTER_SITE_URL: z.string().optional().default("http://localhost:8080"),

  // One model id per provider (OpenRouter slug) — each of the 7 MCP agents picks one
  // of these four (see mcpAgents/agents/*.ts), never a hardcoded string in code, so
  // swapping a provider's model doesn't require a deploy.
  OPENROUTER_MODEL_DEEPSEEK: z.string().min(1).default("deepseek/deepseek-chat"),
  OPENROUTER_MODEL_QWEN: z.string().min(1).default("qwen/qwen-2.5-72b-instruct"),
  OPENROUTER_MODEL_KIMI: z.string().min(1).default("moonshotai/kimi-k3"),
  OPENROUTER_MODEL_CHATGPT: z.string().min(1).default("openai/gpt-5.6-luna-pro"),

  // Optional until a real Resend account is available; the mailer throws a clear
  // error at call time if this is missing (see lib/mailer.ts). Used to deliver
  // staff credentials when a superadmin provisions a new role/account.
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().optional().default("onboarding@resend.dev"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

const secureDefault = process.env.NODE_ENV === "production";
const COOKIE_SECURE = parsed.data.COOKIE_SECURE ? parsed.data.COOKIE_SECURE === "true" : secureDefault;
if (parsed.data.COOKIE_SAMESITE === "none" && !COOKIE_SECURE) {
  throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject SameSite=None cookies that aren't Secure)");
}

export const env = { ...parsed.data, COOKIE_SECURE };
