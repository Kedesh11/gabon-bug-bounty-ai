import type { FraudSignalStatus, FraudSignalType, Prisma, ReportStatus, Severity } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

// v1, heuristic, human-reviewed — none of the 4 checks below ever block an account,
// a report, or a payout on their own. They only ever produce a FraudSignal in status
// "open" for a human (permission fraud.review) to confirm or dismiss.

export interface SignalInput {
  type: FraudSignalType;
  severity: Severity;
  summary: string;
  details: Prisma.InputJsonValue;
  relatedProfileIds?: string[];
  relatedReportId?: string;
  relatedPaymentId?: string;
  relatedPayoutId?: string;
}

// Dedup: if an open/reviewing signal already exists for the exact same evidence, don't
// create a second one every time the scan re-runs. relatedProfileIds must be pre-sorted
// by callers — Prisma's `equals` on a scalar list is order-sensitive.
// Exported so the MCP anti-fraud agent (services/mcpAgents) can raise a
// llm_semantic_anomaly signal through the same dedup path as the 4 heuristics below.
export async function upsertSignal(input: SignalInput) {
  const existing = await prisma.fraudSignal.findFirst({
    where: {
      type: input.type,
      status: { in: ["open", "reviewing"] },
      relatedReportId: input.relatedReportId,
      relatedPaymentId: input.relatedPaymentId,
      relatedPayoutId: input.relatedPayoutId,
      ...(input.relatedProfileIds ? { relatedProfileIds: { equals: input.relatedProfileIds } } : {}),
    },
  });
  if (existing) return null;

  return prisma.fraudSignal.create({
    data: { ...input, relatedProfileIds: input.relatedProfileIds ?? [] },
  });
}

// --- 1. Multi-comptes / faux comptes ----------------------------------------------
// Distinct hacker accounts sharing the same mobile money number, bank account number,
// or crypto wallet address as their payout destination.

const SHARED_DESTINATION_FIELDS = ["phoneNumber", "accountNumber", "walletAddress"] as const;
const FIELD_LABELS: Record<(typeof SHARED_DESTINATION_FIELDS)[number], string> = {
  phoneNumber: "numéro mobile money",
  accountNumber: "numéro de compte bancaire",
  walletAddress: "adresse de portefeuille crypto",
};

function maskValue(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

export async function detectDuplicateAccounts() {
  const configs = await prisma.hackerPaymentConfig.findMany({
    where: {
      OR: SHARED_DESTINATION_FIELDS.map((field) => ({ [field]: { not: null } })),
    },
    select: {
      phoneNumber: true,
      accountNumber: true,
      walletAddress: true,
      hacker: { select: { profileId: true } },
    },
  });

  const created = [];
  for (const field of SHARED_DESTINATION_FIELDS) {
    const groups = new Map<string, string[]>();
    for (const config of configs) {
      const raw = config[field];
      if (!raw) continue;
      const key = raw.trim().toLowerCase();
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(config.hacker.profileId);
      groups.set(key, list);
    }

    for (const [value, profileIds] of groups) {
      const distinct = [...new Set(profileIds)].sort();
      if (distinct.length < 2) continue;

      const signal = await upsertSignal({
        type: "duplicate_account",
        severity: "haute",
        summary: `${distinct.length} comptes hacker partagent le même ${FIELD_LABELS[field]}`,
        details: { field, value: maskValue(value), profileCount: distinct.length },
        relatedProfileIds: distinct,
      });
      if (signal) created.push(signal);
    }
  }
  return created;
}

// --- 2. Collusion hacker-entreprise ------------------------------------------------
// A hacker whose reports concentrate almost entirely on one entreprise, with an
// acceptance rate far above the platform average AND payouts that take far longer
// than the platform average to arrive after submission — consistent with a
// pre-arranged, rubber-stamped relationship rather than genuine independent triage.

const COLLUSION_MIN_PAIR_REPORTS = 3;
const COLLUSION_EXCLUSIVITY_RATIO = 0.8;
const COLLUSION_MIN_ACCEPTANCE_RATE = 0.85;
const COLLUSION_ACCEPTANCE_RATE_DELTA = 0.25;
const COLLUSION_PAYOUT_DELAY_MULTIPLIER = 1.5;

const DECIDED_STATUSES: ReportStatus[] = ["accepte", "rejete", "resolu"];
const ACCEPTED_STATUSES: ReportStatus[] = ["accepte", "resolu"];

function avgDelayHours(reportsSubset: { id: string; createdAt: Date }[], payoutByReportId: Map<string, Date>): number | null {
  const delays = reportsSubset
    .map((r) => {
      const paidAt = payoutByReportId.get(r.id);
      return paidAt ? (paidAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) : null;
    })
    .filter((v): v is number => v !== null);
  return delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : null;
}

export async function detectHackerEntrepriseCollusion() {
  const reports = await prisma.report.findMany({
    where: { status: { in: DECIDED_STATUSES } },
    select: { id: true, hackerId: true, entrepriseId: true, status: true, createdAt: true, hacker: { select: { profileId: true } } },
  });
  if (reports.length === 0) return [];

  const payouts = await prisma.payout.findMany({ select: { reportId: true, createdAt: true } });
  const payoutByReportId = new Map(payouts.map((p) => [p.reportId, p.createdAt]));

  const reportsByHacker = new Map<string, typeof reports>();
  for (const r of reports) {
    const list = reportsByHacker.get(r.hackerId) ?? [];
    list.push(r);
    reportsByHacker.set(r.hackerId, list);
  }

  const created = [];
  for (const [hackerId, hackerReports] of reportsByHacker) {
    const byEntreprise = new Map<string, typeof reports>();
    for (const r of hackerReports) {
      const list = byEntreprise.get(r.entrepriseId) ?? [];
      list.push(r);
      byEntreprise.set(r.entrepriseId, list);
    }

    for (const [entrepriseId, pairReports] of byEntreprise) {
      if (pairReports.length < COLLUSION_MIN_PAIR_REPORTS) continue;
      if (pairReports.length / hackerReports.length < COLLUSION_EXCLUSIVITY_RATIO) continue;

      // Baseline is the rest of the platform's activity, excluding this pair's own
      // reports — comparing a pair against a blend that includes itself would make
      // the "far above average" thresholds nearly impossible to cross for any but
      // the most extreme datasets.
      const pairReportIds = new Set(pairReports.map((r) => r.id));
      const baselineReports = reports.filter((r) => !pairReportIds.has(r.id));
      if (baselineReports.length === 0) continue;

      const pairAccepted = pairReports.filter((r) => ACCEPTED_STATUSES.includes(r.status)).length;
      const pairAcceptanceRate = pairAccepted / pairReports.length;
      if (pairAcceptanceRate < COLLUSION_MIN_ACCEPTANCE_RATE) continue;

      const baselineAccepted = baselineReports.filter((r) => ACCEPTED_STATUSES.includes(r.status)).length;
      const baselineAcceptanceRate = baselineAccepted / baselineReports.length;
      if (pairAcceptanceRate - baselineAcceptanceRate < COLLUSION_ACCEPTANCE_RATE_DELTA) continue;

      const pairAvgPayoutDelayHours = avgDelayHours(pairReports, payoutByReportId);
      const baselineAvgPayoutDelayHours = avgDelayHours(baselineReports, payoutByReportId);
      if (pairAvgPayoutDelayHours === null || !baselineAvgPayoutDelayHours) continue;
      if (pairAvgPayoutDelayHours < baselineAvgPayoutDelayHours * COLLUSION_PAYOUT_DELAY_MULTIPLIER) continue;

      const signal = await upsertSignal({
        type: "hacker_entreprise_collusion",
        severity: "haute",
        summary: `Concentration anormale des rapports d'un chercheur sur une entreprise (${pairReports.length} rapports, ${Math.round(pairAcceptanceRate * 100)}% acceptés)`,
        details: {
          hackerId,
          entrepriseId,
          pairReportsCount: pairReports.length,
          pairAcceptanceRate,
          baselineAcceptanceRate,
          pairAvgPayoutDelayHours,
          baselineAvgPayoutDelayHours,
        },
        relatedProfileIds: [pairReports[0].hacker.profileId],
      });
      if (signal) created.push(signal);
    }
  }
  return created;
}

// --- 3. Rapports plagiés -------------------------------------------------------
// Extension of the Phase 3 "first to report" duplicate check: that one only compares
// exact-match asset+category within a single programme. This compares near-identical
// stepsToReproduce/proof text ACROSS programmes and DIFFERENT hackers — same category,
// (quasi-)identical write-up. No ML/embeddings available, so v1 uses a plain token
// Jaccard similarity, which is enough to catch copy-pasted reports.

const PLAGIARISM_SIMILARITY_THRESHOLD = 0.85;

function normalizeTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function detectPlagiarizedReports() {
  const reports = await prisma.report.findMany({
    where: { vulnerabilityCategoryId: { not: null }, stepsToReproduce: { not: null } },
    select: {
      id: true,
      hackerId: true,
      vulnerabilityCategoryId: true,
      stepsToReproduce: true,
      proof: true,
      createdAt: true,
      hacker: { select: { profileId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byCategory = new Map<string, typeof reports>();
  for (const r of reports) {
    const list = byCategory.get(r.vulnerabilityCategoryId!) ?? [];
    list.push(r);
    byCategory.set(r.vulnerabilityCategoryId!, list);
  }

  const created = [];
  for (const group of byCategory.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.hackerId === b.hackerId) continue;

        const similarity = jaccardSimilarity(
          normalizeTokens(`${a.stepsToReproduce ?? ""} ${a.proof}`),
          normalizeTokens(`${b.stepsToReproduce ?? ""} ${b.proof}`),
        );
        if (similarity < PLAGIARISM_SIMILARITY_THRESHOLD) continue;

        const [earlier, later] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
        const signal = await upsertSignal({
          type: "plagiarized_report",
          severity: "haute",
          summary: `Rapport quasi identique (${Math.round(similarity * 100)}% de similarité) à un rapport antérieur d'un autre chercheur`,
          details: { similarity, earlierReportId: earlier.id, laterReportId: later.id },
          relatedReportId: later.id,
          relatedProfileIds: [earlier.hacker.profileId, later.hacker.profileId].sort(),
        });
        if (signal) created.push(signal);
      }
    }
  }
  return created;
}

// --- 4. Fraude sur les paiements ------------------------------------------------
// (a) A payout requested implausibly fast relative to the programme's own expected
//     triage window (submission-to-payout, not just acceptance-to-payout — an even
//     stronger signal since it means triage was effectively skipped).
// (b) The hacker's payout destination was changed shortly before requesting a payout.

const FAST_PAYOUT_TRIAGE_FRACTION = 0.1;
const CONFIG_CHANGE_WINDOW_HOURS = 1;

export async function detectPaymentAnomalies() {
  const payouts = await prisma.payout.findMany({
    include: {
      report: { include: { programme: { select: { triageTimeHours: true } } } },
      hacker: { include: { paymentConfig: { select: { updatedAt: true } } } },
    },
  });

  const created = [];
  for (const payout of payouts) {
    const delayHours = (payout.createdAt.getTime() - payout.report.createdAt.getTime()) / (1000 * 60 * 60);
    const triageTimeHours = payout.report.programme.triageTimeHours;

    if (triageTimeHours && delayHours >= 0 && delayHours < triageTimeHours * FAST_PAYOUT_TRIAGE_FRACTION) {
      const signal = await upsertSignal({
        type: "payment_anomaly",
        severity: "moyenne",
        summary: `Versement demandé ${delayHours.toFixed(1)}h après soumission, bien en dessous du délai de triage attendu (${triageTimeHours}h)`,
        details: { delayHours, triageTimeHours },
        relatedPayoutId: payout.id,
        relatedProfileIds: [payout.hacker.profileId],
      });
      if (signal) created.push(signal);
    }

    const configUpdatedAt = payout.hacker.paymentConfig?.updatedAt;
    if (configUpdatedAt) {
      const changeDelayHours = (payout.createdAt.getTime() - configUpdatedAt.getTime()) / (1000 * 60 * 60);
      if (changeDelayHours >= 0 && changeDelayHours <= CONFIG_CHANGE_WINDOW_HOURS) {
        const signal = await upsertSignal({
          type: "payment_anomaly",
          severity: "moyenne",
          summary: `Configuration de paiement modifiée ${Math.round(changeDelayHours * 60)} min avant une demande de versement`,
          details: { changeDelayHours },
          relatedPayoutId: payout.id,
          relatedProfileIds: [payout.hacker.profileId],
        });
        if (signal) created.push(signal);
      }
    }
  }
  return created;
}

export async function runFraudScan() {
  const results = await Promise.all([
    detectDuplicateAccounts(),
    detectHackerEntrepriseCollusion(),
    detectPlagiarizedReports(),
    detectPaymentAnomalies(),
  ]);
  return results.flat();
}

export async function listFraudSignals(filters: { status?: FraudSignalStatus; type?: FraudSignalType }) {
  return prisma.fraudSignal.findMany({
    where: { status: filters.status, type: filters.type },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateFraudSignalStatus(id: string, reviewerId: string, status: FraudSignalStatus) {
  const existing = await prisma.fraudSignal.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Signal de fraude introuvable");

  const updated = await prisma.fraudSignal.update({
    where: { id },
    data: { status, reviewedById: reviewerId, reviewedAt: new Date() },
  });

  await createPlatformLog({
    type: "security",
    level: status === "confirmed" ? "warning" : "info",
    message: `Signal de fraude "${updated.summary}" passé au statut "${status}"`,
    source: "fraudService",
    userId: reviewerId,
  });

  return updated;
}
