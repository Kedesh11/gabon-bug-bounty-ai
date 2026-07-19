import { env } from "../../../env.js";
import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";

export const MODEL = env.OPENROUTER_MODEL_DEEPSEEK;

export const classificationSchema = z.object({
  // Key of an existing VulnerabilityCategory (e.g. "xss.stored"), or null if none fit.
  matchedCategoryKey: z.string().nullable(),
  // Only meaningful when matchedCategoryKey is null: a short name to propose.
  proposedCategoryName: z.string().nullable(),
  cweId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type ClassificationOutput = z.infer<typeof classificationSchema>;

export async function runClassificationAgent(context: ReportContext, availableCategoryKeys: string[]) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent de classification de vulnérabilités d'une plateforme de bug bounty.",
        GROUNDING_INSTRUCTION,
        `Catégories existantes disponibles (utilise EXACTEMENT une de ces clés si une convient) : ${availableCategoryKeys.join(", ")}.`,
        "Si aucune catégorie existante ne convient, mets matchedCategoryKey à null et propose un nom court et précis dans proposedCategoryName.",
        'Schéma JSON attendu : {"matchedCategoryKey": string|null, "proposedCategoryName": string|null, "cweId": string|null, "confidence": number (0-1), "reasoning": string}',
      ].join("\n"),
    },
    { role: "user" as const, content: formatReportContextForPrompt(context) },
  ];
  return runAgent(MODEL, messages, classificationSchema);
}
