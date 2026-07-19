import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import { openRouterMocks } from "./setup.js";
import { runMcpPipeline } from "../src/services/mcpAgents/orchestrator.js";
import { runClassificationAgent } from "../src/services/mcpAgents/agents/classification.js";
import { runSeverityAgent } from "../src/services/mcpAgents/agents/severity.js";
import type { ReportContext } from "../src/services/mcpAgents/types.js";

// Distinctive substrings from each agent's own system prompt — used to route the
// shared callOpenRouter mock to the right canned response per agent, since several
// agents share the same underlying model and can't be told apart by model name alone.
const SYSTEM_PROMPT_KEYS = {
  classification: "agent de classification",
  severity: "agent d'évaluation de sévérité",
  falsePositive: "agent de détection de faux positifs",
  antiFraud: "agent anti-fraude",
  recommendation: "agent de recommandation de remédiation",
  decision: "agent de décision",
  reward: "agent de gestion des récompenses",
} as const;

const DEFAULT_RESPONSES: Record<keyof typeof SYSTEM_PROMPT_KEYS, unknown> = {
  classification: { matchedCategoryKey: "xss.stored", proposedCategoryName: null, cweId: "CWE-79", confidence: 0.9, reasoning: "r" },
  severity: { severity: "haute", cvssVector: "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", cvssScore: 7.5, reasoning: "r" },
  falsePositive: { likelyFalsePositive: false, reproductionConfidence: 0.8, reasoning: "r" },
  antiFraud: { suspicious: false, fraudRiskScore: 0.1, indicators: [], reasoning: "r" },
  recommendation: { hasSufficientRemediation: true, suggestion: null, reasoning: "r" },
  decision: { suggestedStatus: "accepte", confidence: 0.85, reasoning: "r" },
  reward: { suggestedReward: 500000, currency: "XAF", reasoning: "r" },
};

type MockOverrides = Partial<Record<keyof typeof SYSTEM_PROMPT_KEYS, unknown | "FAIL">>;

function mockPipelineResponses(overrides: MockOverrides = {}) {
  const merged = { ...DEFAULT_RESPONSES, ...overrides };
  openRouterMocks.callOpenRouter.mockImplementation(async (_model: string, messages: { role: string; content: string }[]) => {
    // Only the opening line ("Tu es l'agent de ...") identifies the CALLING agent —
    // several prompts also mention OTHER agents by name further down (e.g. decision's
    // prompt references "détection de faux positifs" and "agent anti-fraude" inline),
    // so a substring-anywhere match would misidentify those calls.
    const system = messages[0]?.content ?? "";
    const openingLine = system.split("\n")[0];
    for (const [agent, key] of Object.entries(SYSTEM_PROMPT_KEYS)) {
      if (openingLine.includes(key)) {
        const value = merged[agent as keyof typeof SYSTEM_PROMPT_KEYS];
        if (value === "FAIL") throw new Error(`mock failure for ${agent}`);
        return { raw: JSON.stringify(value), parsed: value, promptTokens: 10, completionTokens: 10, latencyMs: 5 };
      }
    }
    throw new Error(`Unmatched system prompt in test mock: ${system.slice(0, 80)}`);
  });
}

// Creates a report via the real POST endpoint — used only by tests that exercise
// the submission flow itself (the fire-and-forget trigger, the manual re-run route).
async function makeReport() {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "xss.stored" } });

  const res = await request(app)
    .post("/api/reports")
    .set("Authorization", hacker.authHeader)
    .send({
      title: "XSS stocké sur le profil utilisateur",
      description: "Injection XSS stockée via le champ bio du profil",
      severity: "moyenne",
      programmeId: programme.id,
      vulnerability: "XSS",
      proof: "poc",
      vulnerabilityCategoryId: category.id,
      affectedAsset: "app.example.com",
      stepsToReproduce: "1. Aller sur /profil 2. Injecter <script>alert(1)</script> dans la bio",
    });
  return { report: res.body.report as { id: string }, hackerId: hacker.id };
}

// Creates a report directly via Prisma, bypassing createReport()'s own automatic
// fire-and-forget pipeline trigger — orchestrator tests call runMcpPipeline exactly
// once themselves, and going through the real POST endpoint would race a second,
// uncontrolled background run against the same reportId.
async function makeReportDirect() {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "xss.stored" } });

  const report = await prisma.report.create({
    data: {
      title: "XSS stocké sur le profil utilisateur",
      description: "Injection XSS stockée via le champ bio du profil",
      severity: "moyenne",
      status: "soumis",
      hackerId: hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entrepriseProfile.id,
      vulnerability: "XSS",
      proof: "poc",
      vulnerabilityCategoryId: category.id,
      affectedAsset: "app.example.com",
      stepsToReproduce: "1. Aller sur /profil 2. Injecter <script>alert(1)</script> dans la bio",
    },
  });
  return { report, hackerId: hacker.id };
}

beforeEach(() => {
  openRouterMocks.callOpenRouter.mockClear();
  mockPipelineResponses();
});

describe("MCP agents — grounding in report content", () => {
  const baseContext: ReportContext = {
    id: "r1",
    title: "Titre unique de test XYZ123",
    description: "Description détaillée du rapport",
    severity: "moyenne",
    vulnerabilityCategoryName: "XSS Stocké",
    cweId: "CWE-79",
    affectedAsset: "app.example.com",
    stepsToReproduce: "étapes précises",
    impact: "impact décrit",
    remediation: null,
    proof: "preuve du hacker",
    cvssVector: null,
    cvssScore: null,
    isDuplicateExactMatch: false,
    programmeName: "Programme test",
    rewardCurrency: "XAF",
    rewardTiers: [],
  };

  it("includes the report's own submitted content in the classification agent's prompt", async () => {
    mockPipelineResponses();
    await runClassificationAgent(baseContext, ["xss.stored", "injection.sql"]);
    const [, messages] = openRouterMocks.callOpenRouter.mock.calls[0];
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("Titre unique de test XYZ123");
    expect(userMessage.content).toContain("preuve du hacker");
  });

  it("passes the upstream classification output into the severity agent's prompt", async () => {
    mockPipelineResponses();
    const classification = { matchedCategoryKey: "xss.stored", proposedCategoryName: null, cweId: "CWE-79", confidence: 0.9, reasoning: "unique-reasoning-marker" };
    await runSeverityAgent(baseContext, classification);
    const [, messages] = openRouterMocks.callOpenRouter.mock.calls[0];
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("unique-reasoning-marker");
  });

  it("marks an agent output as failed when the model returns JSON that doesn't match the schema", async () => {
    openRouterMocks.callOpenRouter.mockResolvedValueOnce({
      raw: '{"not":"the expected shape"}',
      parsed: { not: "the expected shape" },
      promptTokens: 1,
      completionTokens: 1,
      latencyMs: 1,
    });
    await expect(runClassificationAgent(baseContext, ["xss.stored"])).rejects.toThrow();
  });
});

describe("MCP agents — orchestrator pipeline", () => {
  it("runs all 7 agents, stores their outputs, and marks the run/report completed", async () => {
    const { report } = await makeReportDirect();

    await runMcpPipeline(report.id);

    const run = await prisma.mcpAgentRun.findFirstOrThrow({ where: { reportId: report.id }, include: { outputs: true } });
    expect(run.status).toBe("completed");
    expect(run.outputs).toHaveLength(7);
    expect(run.outputs.every((o) => o.status === "completed")).toBe(true);

    const updatedReport = await prisma.report.findUniqueOrThrow({ where: { id: report.id } });
    expect(updatedReport.analysisStatus).toBe("terminee");
  });

  it("passes classification's output forward into severity's prompt (real inter-agent staging, not just parallel isolated calls)", async () => {
    const { report } = await makeReportDirect();
    mockPipelineResponses({
      classification: { matchedCategoryKey: "injection.sql", proposedCategoryName: null, cweId: "CWE-89", confidence: 0.77, reasoning: "staging-marker-abc" },
    });

    await runMcpPipeline(report.id);

    const severityCall = openRouterMocks.callOpenRouter.mock.calls.find(([, messages]: [string, { role: string; content: string }[]]) =>
      messages[0]?.content.includes(SYSTEM_PROMPT_KEYS.severity),
    );
    const userMessage = severityCall[1].find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("staging-marker-abc");
  });

  it("stays resilient when one agent fails: others still complete using a fallback for the missing input", async () => {
    const { report } = await makeReportDirect();
    mockPipelineResponses({ classification: "FAIL" });

    await runMcpPipeline(report.id);

    const run = await prisma.mcpAgentRun.findFirstOrThrow({ where: { reportId: report.id }, include: { outputs: true } });
    expect(run.status).toBe("completed");
    const classificationOutput = run.outputs.find((o) => o.agentType === "vulnerability_analysis");
    expect(classificationOutput?.status).toBe("failed");
    const otherOutputs = run.outputs.filter((o) => o.agentType !== "vulnerability_analysis");
    expect(otherOutputs.every((o) => o.status === "completed")).toBe(true);

    const updatedReport = await prisma.report.findUniqueOrThrow({ where: { id: report.id } });
    expect(updatedReport.analysisStatus).toBe("terminee");
  });

  it("raises a llm_semantic_anomaly fraud signal when the anti-fraud agent flags the report", async () => {
    const { report, hackerId } = await makeReportDirect();
    mockPipelineResponses({
      antiFraud: { suspicious: true, fraudRiskScore: 0.9, indicators: ["paraphrase d'un write-up public connu"], reasoning: "r" },
    });

    await runMcpPipeline(report.id);

    const signal = await prisma.fraudSignal.findFirst({ where: { relatedReportId: report.id, type: "llm_semantic_anomaly" } });
    expect(signal).toBeTruthy();
    expect(signal?.relatedProfileIds).toContain(hackerId);
  });

  it("does not raise a fraud signal when the anti-fraud agent finds nothing suspicious", async () => {
    const { report } = await makeReportDirect();
    mockPipelineResponses({ antiFraud: { suspicious: false, fraudRiskScore: 0.05, indicators: [], reasoning: "r" } });

    await runMcpPipeline(report.id);

    const signal = await prisma.fraudSignal.findFirst({ where: { relatedReportId: report.id, type: "llm_semantic_anomaly" } });
    expect(signal).toBeNull();
  });
});

describe("MCP agents — manual re-run route", () => {
  it("rejects a caller without reports.triage", async () => {
    const { report } = await makeReport();
    const hacker = await createTestUser("hacker");
    const res = await request(app).post(`/api/reports/${report.id}/mcp-analysis`).set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("accepts the trigger and returns 202 without waiting for the pipeline to finish", async () => {
    const { report } = await makeReport();
    const triage = await createTestUser("triage");
    const res = await request(app).post(`/api/reports/${report.id}/mcp-analysis`).set("Authorization", triage.authHeader);
    expect(res.status).toBe(202);
    expect(res.body.started).toBe(true);
  });

  it("404s for a non-existent report", async () => {
    const triage = await createTestUser("triage");
    const res = await request(app)
      .post("/api/reports/00000000-0000-0000-0000-000000000000/mcp-analysis")
      .set("Authorization", triage.authHeader);
    expect(res.status).toBe(404);
  });
});

describe("MCP agents — fire-and-forget trigger on report submission", () => {
  it("returns the submission response without waiting for the pipeline to complete", async () => {
    let resolveAgentCall!: () => void;
    const slowResponse = new Promise<void>((resolve) => {
      resolveAgentCall = resolve;
    });
    openRouterMocks.callOpenRouter.mockImplementation(async () => {
      await slowResponse;
      return { raw: "null", parsed: null, promptTokens: null, completionTokens: null, latencyMs: 0 };
    });

    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const submitPromise = request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "Rapport de test non-bloquant",
        description: "Description de test",
        severity: "faible",
        programmeId: programme.id,
        vulnerability: "XSS",
        proof: "poc",
      });

    const res = await submitPromise;
    expect(res.status).toBe(201);
    // The pipeline's first LLM call is still pending (blocked on slowResponse) at
    // this point — if createReport() were awaiting the pipeline, this response
    // could not have arrived yet.
    resolveAgentCall();
  });
});

describe("MCP agents — public stats endpoint", () => {
  it("returns real aggregate counts, no auth required", async () => {
    const { report } = await makeReportDirect();
    await runMcpPipeline(report.id);

    const res = await request(app).get("/api/mcp-agents/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBeGreaterThan(0);
    expect(res.body.totalOutputs).toBeGreaterThanOrEqual(7);
    expect(res.body.completionRate).toBeGreaterThan(0);
  });
});
