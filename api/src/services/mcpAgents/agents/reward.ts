import { env } from "../../../env.js";
import { z } from "zod";
import { runAgent, GROUNDING_INSTRUCTION } from "./shared.js";
import { formatReportContextForPrompt } from "../reportContext.js";
import type { ReportContext } from "../types.js";
import type { SeverityOutput } from "./severity.js";
import type { DecisionOutput } from "./decision.js";

export const MODEL = env.OPENROUTER_MODEL_CHATGPT;

export const rewardSchema = z.object({
  // null when suggestedStatus isn't "accepte" — no reward to suggest for a rejected/pending report.
  suggestedReward: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  reasoning: z.string(),
});
export type RewardOutput = z.infer<typeof rewardSchema>;

export async function runRewardAgent(context: ReportContext, severity: SeverityOutput, decision: DecisionOutput) {
  const messages = [
    {
      role: "system" as const,
      content: [
        "Tu es l'agent de gestion des récompenses d'une plateforme de bug bounty.",
        GROUNDING_INSTRUCTION,
        "Le montant suggéré DOIT rester à l'intérieur des tiers de récompense du programme (rewardTiers, min/max par sévérité) fournis ci-dessous — n'invente jamais un montant hors de ces bornes. " +
          "Si le tier correspondant à la sévérité retenue n'existe pas, utilise les bornes globales min/max du programme.",
        "Si la décision suggérée n'est pas \"accepte\", mets suggestedReward à null : il n'y a rien à récompenser tant que ce n'est pas accepté.",
        'Schéma JSON attendu : {"suggestedReward": number entier|null, "currency": string, "reasoning": string}',
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        formatReportContextForPrompt(context),
        "",
        "=== TIERS DE RÉCOMPENSE DU PROGRAMME ===",
        JSON.stringify({ rewardCurrency: context.rewardCurrency, rewardTiers: context.rewardTiers }),
        "",
        "=== SORTIES DES AGENTS PRÉCÉDENTS ===",
        JSON.stringify({ severity, decision }),
      ].join("\n"),
    },
  ];
  return runAgent(MODEL, messages, rewardSchema);
}
