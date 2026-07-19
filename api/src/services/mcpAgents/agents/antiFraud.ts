import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { ClassificationOutput } from "./classification.js";
import type { FalsePositiveOutput } from "./falsePositive.js";

export const MODEL = "qwen/qwen-2.5-72b-instruct";

export const antiFraudSchema = z.object({
  suspicious: z.boolean(),
  fraudRiskScore: z.number().min(0).max(1),
  // Short, specific observations — not a generic "could be fraud" statement.
  indicators: z.array(z.string()),
  reasoning: z.string(),
});
export type AntiFraudOutput = z.infer<typeof antiFraudSchema>;

export async function runAntiFraudAgent(
  context: ReportContext,
  classification: ClassificationOutput,
  falsePositive: FalsePositiveOutput,
) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent anti-fraude d'une plateforme de bug bounty, spécialisé dans la détection sémantique — pas le simple copier-coller.",
        GROUNDING_INSTRUCTION,
        "La plateforme détecte déjà les rapports quasi-identiques mot pour mot (chevauchement de tokens) — ton rôle est de repérer ce que cette méthode manque : paraphrase d'un autre rapport ou d'un write-up public déjà connu, incohérences internes (l'actif décrit ne correspond pas aux étapes, la preuve ne correspond pas à la vulnérabilité annoncée), langage suggérant une connaissance interne au lieu d'une découverte indépendante, ou des étapes de reproduction trop génériques/copiées d'un tutoriel générique sans rapport avec l'actif réel.",
        "Ne signale suspicious=true que si tu observes des indices concrets et spécifiques à CE rapport — pas par défaut.",
        'Schéma JSON attendu : {"suspicious": boolean, "fraudRiskScore": number (0-1), "indicators": string[], "reasoning": string}',
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        formatReportContextForPrompt(context),
        "",
        "=== SORTIES DES AGENTS PRÉCÉDENTS ===",
        JSON.stringify({ classification, falsePositive }),
      ].join("\n"),
    },
  ];
  return runAgent(MODEL, messages, antiFraudSchema);
}
