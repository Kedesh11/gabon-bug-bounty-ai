import { prisma } from "../prisma.js";

export type AiAnalysisBlock = "disabled" | "no_consent";

// The single rule deciding whether a report may be sent to the LLM providers: the platform
// admin switched the analysis on AND the report's author consented. Used by the pipeline
// itself (so no code path can bypass it) and by the manual re-run route (for a clear 409).
export async function getAiAnalysisBlock(reportId: string): Promise<AiAnalysisBlock | null> {
  const [config, report] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: 1 }, select: { aiAnalysisEnabled: true } }),
    prisma.report.findUnique({ where: { id: reportId }, select: { aiAnalysisConsent: true } }),
  ]);
  if (!config?.aiAnalysisEnabled) return "disabled";
  if (!report?.aiAnalysisConsent) return "no_consent";
  return null;
}

export const AI_BLOCK_MESSAGES: Record<AiAnalysisBlock, string> = {
  disabled: "L'analyse IA est désactivée sur cette plateforme (réglage administrateur).",
  no_consent: "L'auteur de ce rapport n'a pas consenti à son traitement par des fournisseurs d'IA tiers.",
};
