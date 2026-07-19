import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { ClassificationOutput } from "./classification.js";
import type { SeverityOutput } from "./severity.js";
import type { FalsePositiveOutput } from "./falsePositive.js";
import type { AntiFraudOutput } from "./antiFraud.js";

export const MODEL = "openai/gpt-4o-mini";

export const decisionSchema = z.object({
  // "en_analyse" = needs more information from the hacker before a call can be made.
  suggestedStatus: z.enum(["accepte", "rejete", "en_analyse"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type DecisionOutput = z.infer<typeof decisionSchema>;

// Synthesis agent: reads every upstream agent's output, not just the raw report.
// This is the suggestion the triage team sees front-and-center — it is NEVER
// applied automatically, only pre-fills the existing manual triage form.
export async function runDecisionAgent(
  context: ReportContext,
  upstream: {
    classification: ClassificationOutput;
    severity: SeverityOutput;
    falsePositive: FalsePositiveOutput;
    antiFraud: AntiFraudOutput | null;
  },
) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent de décision d'une plateforme de bug bounty. Tu synthétises les analyses des autres agents pour suggérer une décision de triage — cette suggestion est toujours revue par un humain, tu ne décides jamais seul.",
        GROUNDING_INSTRUCTION,
        "Si l'agent anti-fraude ou de détection de faux positifs a des doutes sérieux, penche vers \"en_analyse\" plutôt que \"rejete\" catégorique — laisse la triage humaine trancher les cas ambigus.",
        'Schéma JSON attendu : {"suggestedStatus": "accepte"|"rejete"|"en_analyse", "confidence": number (0-1), "reasoning": string}',
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        formatReportContextForPrompt(context),
        "",
        "=== SORTIES DE TOUS LES AGENTS PRÉCÉDENTS ===",
        JSON.stringify(upstream),
      ].join("\n"),
    },
  ];
  return runAgent(MODEL, messages, decisionSchema);
}
