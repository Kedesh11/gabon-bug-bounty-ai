import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { ClassificationOutput } from "./classification.js";

export const MODEL = "qwen/qwen-2.5-72b-instruct";

export const falsePositiveSchema = z.object({
  likelyFalsePositive: z.boolean(),
  // How reproducible/plausible the described steps and proof are, independent of severity.
  reproductionConfidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type FalsePositiveOutput = z.infer<typeof falsePositiveSchema>;

export async function runFalsePositiveAgent(context: ReportContext, classification: ClassificationOutput) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent de détection de faux positifs d'une plateforme de bug bounty.",
        GROUNDING_INSTRUCTION,
        "Évalue si les étapes de reproduction et la preuve décrites sont cohérentes, plausibles et suffisamment détaillées pour constituer une vulnérabilité réelle.",
        "Le système a déjà détecté d'éventuels doublons exacts (même programme+catégorie+actif) — ce n'est pas ton rôle de le refaire, concentre-toi sur la plausibilité intrinsèque du rapport.",
        'Schéma JSON attendu : {"likelyFalsePositive": boolean, "reproductionConfidence": number (0-1), "reasoning": string}',
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        formatReportContextForPrompt(context),
        "",
        "=== CLASSIFICATION DÉJÀ ÉTABLIE PAR L'AGENT PRÉCÉDENT ===",
        JSON.stringify(classification),
      ].join("\n"),
    },
  ];
  return runAgent(MODEL, messages, falsePositiveSchema);
}
