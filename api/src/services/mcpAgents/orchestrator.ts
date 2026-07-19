import type { McpAgentType, Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { buildReportContext } from "./reportContext.js";
import { upsertSignal } from "../fraud/fraudService.js";
import type { AgentOutcome } from "./agents/shared.js";
import { runClassificationAgent, type ClassificationOutput, MODEL as CLASSIFICATION_MODEL } from "./agents/classification.js";
import { runSeverityAgent, type SeverityOutput, MODEL as SEVERITY_MODEL } from "./agents/severity.js";
import { runFalsePositiveAgent, type FalsePositiveOutput, MODEL as FALSE_POSITIVE_MODEL } from "./agents/falsePositive.js";
import { runAntiFraudAgent, type AntiFraudOutput, MODEL as ANTI_FRAUD_MODEL } from "./agents/antiFraud.js";
import { runRecommendationAgent, MODEL as RECOMMENDATION_MODEL } from "./agents/recommendation.js";
import { runDecisionAgent, type DecisionOutput, MODEL as DECISION_MODEL } from "./agents/decision.js";
import { runRewardAgent, MODEL as REWARD_MODEL } from "./agents/reward.js";

const FALLBACK_CLASSIFICATION: ClassificationOutput = {
  matchedCategoryKey: null,
  proposedCategoryName: null,
  cweId: null,
  confidence: 0,
  reasoning: "Analyse de classification indisponible (l'agent a échoué) — les agents en aval travaillent sans cette information.",
};

const FALLBACK_SEVERITY: SeverityOutput = {
  severity: "info",
  cvssVector: null,
  cvssScore: null,
  reasoning: "Analyse de sévérité indisponible (l'agent a échoué).",
};

const FALLBACK_FALSE_POSITIVE: FalsePositiveOutput = {
  likelyFalsePositive: false,
  reproductionConfidence: 0,
  reasoning: "Analyse de faux positif indisponible (l'agent a échoué).",
};

// Persists one agent's outcome (success or failure) as a McpAgentOutput row, and
// returns the parsed output — or null if the agent failed. A failure here NEVER
// throws out of this function: the pipeline continues with whatever succeeded.
async function runStage<T>(
  runId: string,
  agentType: McpAgentType,
  model: string,
  input: unknown,
  call: () => Promise<AgentOutcome<T>>,
): Promise<T | null> {
  try {
    const outcome = await call();
    await prisma.mcpAgentOutput.create({
      data: {
        runId,
        agentType,
        model: outcome.model,
        status: "completed",
        input: input as Prisma.InputJsonValue,
        output: outcome.output as Prisma.InputJsonValue,
        rawResponse: outcome.rawResponse,
        promptTokens: outcome.promptTokens,
        completionTokens: outcome.completionTokens,
        latencyMs: outcome.latencyMs,
      },
    });
    return outcome.output;
  } catch (err) {
    await prisma.mcpAgentOutput.create({
      data: {
        runId,
        agentType,
        model,
        status: "failed",
        input: input as Prisma.InputJsonValue,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

// Entry point — called fire-and-forget from createReport() and from the manual
// POST /:id/mcp-analysis route. Never throws: any unexpected failure is caught and
// recorded so Report.analysisStatus doesn't get stuck at "en_cours" forever.
export async function runMcpPipeline(reportId: string): Promise<void> {
  // The whole body — including creating the run row itself — is wrapped in one
  // try/catch: a report that vanishes mid-flight (deleted concurrently) must never
  // produce an unhandled rejection, only a logged, absorbed failure.
  let runId: string | null = null;
  try {
    const run = await prisma.mcpAgentRun.create({
      data: { reportId, status: "running", startedAt: new Date() },
    });
    runId = run.id;

    await prisma.report.update({ where: { id: reportId }, data: { analysisStatus: "en_cours" } });

    const report = await prisma.report.findUniqueOrThrow({
      where: { id: reportId },
      include: {
        vulnerabilityCategory: true,
        aiAnalysis: true,
        programme: { include: { rewardTiers: true } },
        hacker: { select: { profileId: true } },
      },
    });
    const context = buildReportContext(report);
    const availableCategoryKeys = (await prisma.vulnerabilityCategory.findMany({ select: { key: true } })).map((c) => c.key);

    // Stage 1: classification alone — everything else needs its output.
    const classification = await runStage(runId, "vulnerability_analysis", CLASSIFICATION_MODEL, { availableCategoryKeys }, () =>
      runClassificationAgent(context, availableCategoryKeys),
    );
    const classificationForDownstream = classification ?? FALLBACK_CLASSIFICATION;

    // Stage 2 (parallel): severity, false-positive, recommendation — each only needs
    // classification. Recommendation's output isn't consumed by any later agent (it's
    // a leaf, presented directly to triage) — runStage already persists it, nothing
    // further to do with the returned value here.
    const [severity, falsePositive] = await Promise.all([
      runStage(runId, "severity_assessment", SEVERITY_MODEL, { classification: classificationForDownstream }, () =>
        runSeverityAgent(context, classificationForDownstream),
      ),
      runStage(runId, "false_positive_detection", FALSE_POSITIVE_MODEL, { classification: classificationForDownstream }, () =>
        runFalsePositiveAgent(context, classificationForDownstream),
      ),
      runStage(runId, "recommendation", RECOMMENDATION_MODEL, { classification: classificationForDownstream }, () =>
        runRecommendationAgent(context, classificationForDownstream),
      ),
    ]);
    const severityForDownstream = severity ?? FALLBACK_SEVERITY;
    const falsePositiveForDownstream = falsePositive ?? FALLBACK_FALSE_POSITIVE;

    // Stage 3: anti-fraud — needs false-positive's output to avoid a redundant signal.
    const antiFraud = await runStage(
      runId,
      "anti_fraud",
      ANTI_FRAUD_MODEL,
      { classification: classificationForDownstream, falsePositive: falsePositiveForDownstream },
      () => runAntiFraudAgent(context, classificationForDownstream, falsePositiveForDownstream),
    );

    // Stage 4 (parallel): decision and reward — synthesis agents, need everything above.
    const decision = await runStage(
      runId,
      "decision",
      DECISION_MODEL,
      { classification: classificationForDownstream, severity: severityForDownstream, falsePositive: falsePositiveForDownstream, antiFraud },
      () =>
        runDecisionAgent(context, {
          classification: classificationForDownstream,
          severity: severityForDownstream,
          falsePositive: falsePositiveForDownstream,
          antiFraud,
        }),
    );
    const decisionForDownstream: DecisionOutput =
      decision ?? { suggestedStatus: "en_analyse", confidence: 0, reasoning: "Analyse de décision indisponible (l'agent a échoué)." };

    await runStage(runId, "reward", REWARD_MODEL, { severity: severityForDownstream, decision: decisionForDownstream }, () =>
      runRewardAgent(context, severityForDownstream, decisionForDownstream),
    );

    // Anti-fraude → signal de fraude existant, même chemin de dédup que les 4 heuristiques.
    if (antiFraud && (antiFraud as AntiFraudOutput).suspicious) {
      await upsertSignal({
        type: "llm_semantic_anomaly",
        severity: severityForDownstream.severity,
        summary: `Anomalie sémantique détectée par l'agent anti-fraude IA sur le rapport "${context.title}"`,
        details: { reportId: context.id, ...antiFraud } as Prisma.InputJsonValue,
        relatedReportId: context.id,
        relatedProfileIds: [report.hacker.profileId],
      });
    }

    await prisma.mcpAgentRun.update({ where: { id: runId }, data: { status: "completed", completedAt: new Date() } });
    await prisma.report.update({ where: { id: reportId }, data: { analysisStatus: "terminee" } });
  } catch (err) {
    console.error(`[mcpAgents] pipeline failed for report ${reportId}:`, err);
    if (runId) {
      await prisma.mcpAgentRun.update({ where: { id: runId }, data: { status: "failed", completedAt: new Date() } }).catch(() => {});
    }
    await prisma.report.update({ where: { id: reportId }, data: { analysisStatus: "terminee" } }).catch(() => {});
  }
}
