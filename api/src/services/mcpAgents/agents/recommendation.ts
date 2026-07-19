import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { ClassificationOutput } from "./classification.js";

export const MODEL = "moonshotai/kimi-k2";

export const recommendationSchema = z.object({
  // True if the hacker's own `remediation` field is already substantial —
  // the agent's suggestion is then optional enrichment, not a replacement.
  hasSufficientRemediation: z.boolean(),
  suggestion: z.string().nullable(),
  reasoning: z.string(),
});
export type RecommendationOutput = z.infer<typeof recommendationSchema>;

// Depends only on classification, not severity — remediation follows the
// vulnerability's TYPE, not how urgent it is, and this keeps it in the same
// parallel stage as severity/false-positive (neither of which it needs).
export async function runRecommendationAgent(context: ReportContext, classification: ClassificationOutput) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent de recommandation de remédiation d'une plateforme de bug bounty.",
        GROUNDING_INSTRUCTION,
        "RÈGLE IMPORTANTE : regarde d'abord le champ \"Remédiation déjà proposée par le hacker\" dans le rapport. " +
          "Si elle est déjà substantielle et pertinente, mets hasSufficientRemediation à true et laisse suggestion à null, " +
          "ou propose seulement un complément mineur si un point précis manque — ne réécris jamais une remédiation déjà correcte. " +
          "Si elle est absente ou clairement insuffisante, mets hasSufficientRemediation à false et rédige une suggestion " +
          "ancrée dans la catégorie de vulnérabilité et la sévérité identifiées, pas une remédiation générique déconnectée du rapport.",
        'Schéma JSON attendu : {"hasSufficientRemediation": boolean, "suggestion": string|null, "reasoning": string}',
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        formatReportContextForPrompt(context),
        "",
        "=== SORTIE DE L'AGENT DE CLASSIFICATION ===",
        JSON.stringify(classification),
      ].join("\n"),
    },
  ];
  return runAgent(MODEL, messages, recommendationSchema);
}
