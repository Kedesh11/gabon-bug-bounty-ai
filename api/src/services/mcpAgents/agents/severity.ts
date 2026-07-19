import { env } from "../../../env.js";
import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { ClassificationOutput } from "./classification.js";

export const MODEL = env.OPENROUTER_MODEL_DEEPSEEK;

export const severitySchema = z.object({
  severity: z.enum(["critique", "haute", "moyenne", "faible", "info"]),
  cvssVector: z.string().nullable(),
  cvssScore: z.number().min(0).max(10).nullable(),
  reasoning: z.string(),
});
export type SeverityOutput = z.infer<typeof severitySchema>;

export async function runSeverityAgent(context: ReportContext, classification: ClassificationOutput) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent d'évaluation de sévérité d'une plateforme de bug bounty, spécialisé en scoring CVSS v3.1.",
        GROUNDING_INSTRUCTION,
        "Si le hacker a déjà renseigné un vecteur/score CVSS dans le rapport, vérifie sa cohérence plutôt que d'en inventer un différent sans justification.",
        'Schéma JSON attendu : {"severity": "critique"|"haute"|"moyenne"|"faible"|"info", "cvssVector": string|null, "cvssScore": number (0-10)|null, "reasoning": string}',
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
  return runAgent(MODEL, messages, severitySchema);
}
