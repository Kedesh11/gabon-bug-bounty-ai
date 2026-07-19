import type { z } from "zod";
import { callOpenRouter, type ChatMessage } from "../openRouterClient.js";

// Applied verbatim in every agent's system prompt — the core anti-hallucination
// constraint: an agent's output must be traceable to the report's own content, never
// invented. Submitting a report would be pointless if agents ignored what's in it.
export const GROUNDING_INSTRUCTION =
  "Fonde ton analyse strictement sur les preuves contenues dans le rapport ci-dessous. " +
  "N'invente aucun détail absent du rapport. Si une information manque, signale-le " +
  "explicitement (par une valeur null ou une remarque) plutôt que de l'inventer. " +
  "Réponds uniquement avec un objet JSON valide respectant exactement le schéma demandé, sans texte hors du JSON.";

export interface AgentOutcome<T> {
  model: string;
  output: T;
  rawResponse: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
}

// Shared plumbing for every agent: call OpenRouter, zod-validate the parsed JSON.
// Throws on failure (invalid JSON, schema mismatch, HTTP error) — the orchestrator
// catches this per-agent so one bad response doesn't take down the whole pipeline.
export async function runAgent<T>(model: string, messages: ChatMessage[], schema: z.ZodType<T>): Promise<AgentOutcome<T>> {
  const result = await callOpenRouter(model, messages);
  const validated = schema.safeParse(result.parsed);
  if (!validated.success) {
    throw new Error(`Réponse invalide du modèle ${model}: ${validated.error.message}`);
  }
  return {
    model,
    output: validated.data,
    rawResponse: result.raw,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs: result.latencyMs,
  };
}
