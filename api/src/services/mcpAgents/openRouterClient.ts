import { env } from "../../env.js";

function requireOpenRouterCredentials() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter non configuré (OPENROUTER_API_KEY manquant) — voir api/.env.example");
  }
  return env.OPENROUTER_API_KEY;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface OpenRouterResult {
  raw: string;
  // JSON.parse(raw), or null if the model didn't return valid JSON — callers
  // zod-validate this themselves and decide how to treat a null/malformed result.
  parsed: unknown;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
}

interface OpenRouterChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<OpenRouterResult> {
  const apiKey = requireOpenRouterCredentials();
  const startedAt = Date.now();

  const res = await fetch(env.OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.OPENROUTER_SITE_URL,
      // Header values must be Latin-1/ByteString — no em-dash or other non-ASCII here.
      "X-Title": "Gabon Bug Bounty AI - MCP Agents",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      // Every agent returns a handful of short JSON fields — without a cap some
      // models default to their full context window (Kimi K2: 65536), which some
      // OpenRouter accounts don't have the credit balance to cover.
      max_tokens: 2000,
    }),
  });

  const latencyMs = Date.now() - startedAt;
  const json = (await res.json()) as OpenRouterChatResponse;

  if (!res.ok) {
    throw new Error(`OpenRouter error (${model}): ${res.status} ${json.error?.message ?? JSON.stringify(json)}`);
  }

  const raw = json.choices?.[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  return {
    raw,
    parsed,
    promptTokens: json.usage?.prompt_tokens ?? null,
    completionTokens: json.usage?.completion_tokens ?? null,
    latencyMs,
  };
}
