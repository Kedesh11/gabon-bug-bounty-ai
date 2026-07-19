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
  OPENROUTER_MODEL_KIMI: z.string().min(1).default("moonshotai/kimi-k2"),
  OPENROUTER_MODEL_CHATGPT: z.string().min(1).default("openai/gpt-4o-mini"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
