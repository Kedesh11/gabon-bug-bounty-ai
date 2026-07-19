import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import {
  detectDuplicateAccounts,
  detectHackerEntrepriseCollusion,
  detectPlagiarizedReports,
  detectPaymentAnomalies,
} from "../src/services/fraud/fraudService.js";

// Unlike every other test file, the heuristics under test here scan whole tables
// (all reports, all payouts, all payment configs) rather than querying by a specific
// relation — so, unlike the rest of the suite, they ARE sensitive to rows left over
// from earlier test runs against this persistent dev database. No other test file
// depends on pre-existing reports/payouts/payment-configs, so a one-time wipe here is
// safe and makes this file (and only this file) reliably re-runnable in isolation.
beforeAll(async () => {
  await prisma.report.deleteMany({});
  await prisma.hackerPaymentConfig.deleteMany({});
  await prisma.fraudSignal.deleteMany({});
});

async function makeHacker() {
  const user = await createTestUser("hacker");
  const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: user.id } });
  return { user, hackerProfile };
}

async function makeEntreprise() {
  const user = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: user.id } });
  return { user, entrepriseProfile };
}

async function makeReport(opts: {
  hackerId: string;
  programmeId: string;
  entrepriseId: string;
  status?: "soumis" | "en_analyse" | "accepte" | "rejete" | "resolu";
  createdAt?: Date;
  vulnerabilityCategoryId?: string;
  stepsToReproduce?: string;
  proof?: string;
  affectedAsset?: string;
}) {
  return prisma.report.create({
    data: {
      title: "Rapport de test fraude",
      description: "Description de test",
      severity: "moyenne",
      status: opts.status ?? "soumis",
      hackerId: opts.hackerId,
      programmeId: opts.programmeId,
      entrepriseId: opts.entrepriseId,
      vulnerability: "XSS",
      proof: opts.proof ?? "poc",
      createdAt: opts.createdAt,
      vulnerabilityCategoryId: opts.vulnerabilityCategoryId,
      stepsToReproduce: opts.stepsToReproduce,
      affectedAsset: opts.affectedAsset,
    },
  });
}

async function makePayout(opts: { reportId: string; hackerId: string; createdAt: Date }) {
  return prisma.payout.create({
    data: {
      reportId: opts.reportId,
      hackerId: opts.hackerId,
      provider: "stripe",
      status: "succeeded",
      amount: 100000,
      currency: "XAF",
      createdAt: opts.createdAt,
    },
  });
}

describe("Fraud detection — duplicate accounts", () => {
  it("flags two distinct hackers sharing the same mobile money number", async () => {
    const a = await makeHacker();
    const b = await makeHacker();
    await prisma.hackerPaymentConfig.create({ data: { hackerId: a.hackerProfile.id, phoneNumber: "+24177000001" } });
    await prisma.hackerPaymentConfig.create({ data: { hackerId: b.hackerProfile.id, phoneNumber: "+24177000001" } });

    const signals = await detectDuplicateAccounts();
    const match = signals.find(
      (s) => s.details && (s.details as { field?: string }).field === "phoneNumber" && s.relatedProfileIds.includes(a.user.id) && s.relatedProfileIds.includes(b.user.id),
    );
    expect(match).toBeTruthy();
    expect(match?.type).toBe("duplicate_account");
  });

  it("does not flag two hackers with different mobile money numbers", async () => {
    const a = await makeHacker();
    const b = await makeHacker();
    await prisma.hackerPaymentConfig.create({ data: { hackerId: a.hackerProfile.id, phoneNumber: "+24177000002" } });
    await prisma.hackerPaymentConfig.create({ data: { hackerId: b.hackerProfile.id, phoneNumber: "+24177000003" } });

    const signals = await detectDuplicateAccounts();
    const match = signals.find((s) => s.relatedProfileIds.includes(a.user.id) && s.relatedProfileIds.includes(b.user.id));
    expect(match).toBeUndefined();
  });
});

describe("Fraud detection — hacker/entreprise collusion", () => {
  it("flags a hacker whose reports concentrate on one entreprise with high acceptance and slow payouts vs. the rest of the platform", async () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const hacker = await makeHacker();
    const target = await makeEntreprise();
    const targetProgramme = await createTestProgramme(target.entrepriseProfile.id);

    // The concentrated pair: 4 reports, all accepted, payouts arriving 300h later.
    for (let i = 0; i < 4; i++) {
      const report = await makeReport({
        hackerId: hacker.hackerProfile.id,
        programmeId: targetProgramme.id,
        entrepriseId: target.entrepriseProfile.id,
        status: "accepte",
        createdAt: base,
      });
      await makePayout({ reportId: report.id, hackerId: hacker.hackerProfile.id, createdAt: new Date(base.getTime() + 300 * 3600_000) });
    }

    // Unrelated baseline activity: different hacker/entreprise, low acceptance, fast payout.
    const otherHacker = await makeHacker();
    const otherEntreprise = await makeEntreprise();
    const otherProgramme = await createTestProgramme(otherEntreprise.entrepriseProfile.id);
    const acceptedBaseline = await makeReport({
      hackerId: otherHacker.hackerProfile.id,
      programmeId: otherProgramme.id,
      entrepriseId: otherEntreprise.entrepriseProfile.id,
      status: "accepte",
      createdAt: base,
    });
    await makePayout({ reportId: acceptedBaseline.id, hackerId: otherHacker.hackerProfile.id, createdAt: new Date(base.getTime() + 5 * 3600_000) });
    for (let i = 0; i < 3; i++) {
      await makeReport({
        hackerId: otherHacker.hackerProfile.id,
        programmeId: otherProgramme.id,
        entrepriseId: otherEntreprise.entrepriseProfile.id,
        status: "rejete",
        createdAt: base,
      });
    }

    const signals = await detectHackerEntrepriseCollusion();
    const match = signals.find((s) => s.relatedProfileIds.includes(hacker.user.id));
    expect(match).toBeTruthy();
    expect(match?.type).toBe("hacker_entreprise_collusion");
  });

  it("does not flag a hacker whose reports are spread across multiple entreprises", async () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const hacker = await makeHacker();
    const entrepriseX = await makeEntreprise();
    const entrepriseZ = await makeEntreprise();
    const programmeX = await createTestProgramme(entrepriseX.entrepriseProfile.id);
    const programmeZ = await createTestProgramme(entrepriseZ.entrepriseProfile.id);

    for (let i = 0; i < 2; i++) {
      const r = await makeReport({
        hackerId: hacker.hackerProfile.id,
        programmeId: programmeX.id,
        entrepriseId: entrepriseX.entrepriseProfile.id,
        status: "accepte",
        createdAt: base,
      });
      await makePayout({ reportId: r.id, hackerId: hacker.hackerProfile.id, createdAt: new Date(base.getTime() + 300 * 3600_000) });
    }
    for (let i = 0; i < 2; i++) {
      const r = await makeReport({
        hackerId: hacker.hackerProfile.id,
        programmeId: programmeZ.id,
        entrepriseId: entrepriseZ.entrepriseProfile.id,
        status: "accepte",
        createdAt: base,
      });
      await makePayout({ reportId: r.id, hackerId: hacker.hackerProfile.id, createdAt: new Date(base.getTime() + 300 * 3600_000) });
    }

    const signals = await detectHackerEntrepriseCollusion();
    const match = signals.find((s) => s.relatedProfileIds.includes(hacker.user.id));
    expect(match).toBeUndefined();
  });
});

describe("Fraud detection — plagiarized reports", () => {
  it("flags near-identical write-ups from two different hackers on different programmes", async () => {
    const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "injection.sql" } });
    const hackerA = await makeHacker();
    const hackerB = await makeHacker();
    const entrepriseA = await makeEntreprise();
    const entrepriseB = await makeEntreprise();
    const programmeA = await createTestProgramme(entrepriseA.entrepriseProfile.id);
    const programmeB = await createTestProgramme(entrepriseB.entrepriseProfile.id);

    const steps = "1. Aller sur le formulaire de connexion 2. Injecter le payload admin' OR 1=1 -- dans le champ email 3. Observer le contournement de l'authentification";

    const earlier = await makeReport({
      hackerId: hackerA.hackerProfile.id,
      programmeId: programmeA.id,
      entrepriseId: entrepriseA.entrepriseProfile.id,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      vulnerabilityCategoryId: category.id,
      stepsToReproduce: steps,
      proof: "capture d'écran du bypass",
    });
    const later = await makeReport({
      hackerId: hackerB.hackerProfile.id,
      programmeId: programmeB.id,
      entrepriseId: entrepriseB.entrepriseProfile.id,
      createdAt: new Date("2026-01-02T00:00:00Z"),
      vulnerabilityCategoryId: category.id,
      stepsToReproduce: steps,
      proof: "capture d'écran du bypass",
    });

    const signals = await detectPlagiarizedReports();
    const match = signals.find((s) => (s.details as { laterReportId?: string }).laterReportId === later.id);
    expect(match).toBeTruthy();
    expect(match?.type).toBe("plagiarized_report");
    expect((match?.details as { earlierReportId?: string }).earlierReportId).toBe(earlier.id);
  });

  it("does not flag two reports in the same category with unrelated write-ups", async () => {
    const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "injection.sql" } });
    const hackerA = await makeHacker();
    const hackerB = await makeHacker();
    const entrepriseA = await makeEntreprise();
    const entrepriseB = await makeEntreprise();
    const programmeA = await createTestProgramme(entrepriseA.entrepriseProfile.id);
    const programmeB = await createTestProgramme(entrepriseB.entrepriseProfile.id);

    const reportA = await makeReport({
      hackerId: hackerA.hackerProfile.id,
      programmeId: programmeA.id,
      entrepriseId: entrepriseA.entrepriseProfile.id,
      vulnerabilityCategoryId: category.id,
      stepsToReproduce: "Ouvrir /export en tant qu'utilisateur non privilégié et télécharger le fichier CSV de tous les employés",
      proof: "export.csv contient des données sensibles",
    });
    const reportB = await makeReport({
      hackerId: hackerB.hackerProfile.id,
      programmeId: programmeB.id,
      entrepriseId: entrepriseB.entrepriseProfile.id,
      vulnerabilityCategoryId: category.id,
      stepsToReproduce: "Envoyer une requête POST vers /api/webhook avec un en-tête Content-Length falsifié pour provoquer un request smuggling",
      proof: "réponse HTTP désynchronisée observée via Burp",
    });

    const signals = await detectPlagiarizedReports();
    const match = signals.find(
      (s) =>
        (s.details as { laterReportId?: string; earlierReportId?: string }).laterReportId &&
        [reportA.id, reportB.id].includes((s.details as { laterReportId: string }).laterReportId),
    );
    expect(match).toBeUndefined();
  });
});

describe("Fraud detection — payment anomalies", () => {
  it("flags a payout requested well below the programme's expected triage window", async () => {
    const hacker = await makeHacker();
    const entreprise = await makeEntreprise();
    const programme = await prisma.programme.create({
      data: {
        name: "Programme triage strict",
        description: "d",
        entrepriseId: entreprise.entrepriseProfile.id,
        minReward: 1000,
        maxReward: 5000,
        triageTimeHours: 100,
      },
    });
    const base = new Date("2026-01-01T00:00:00Z");
    const report = await makeReport({
      hackerId: hacker.hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entreprise.entrepriseProfile.id,
      status: "accepte",
      createdAt: base,
    });
    const payout = await makePayout({ reportId: report.id, hackerId: hacker.hackerProfile.id, createdAt: new Date(base.getTime() + 1 * 3600_000) });

    const signals = await detectPaymentAnomalies();
    const match = signals.find((s) => (s.details as { delayHours?: number }).delayHours !== undefined && s.relatedPayoutId === payout.id);
    expect(match).toBeTruthy();
    expect(match?.type).toBe("payment_anomaly");
  });

  it("does not flag a payout requested well within the expected triage window", async () => {
    const hacker = await makeHacker();
    const entreprise = await makeEntreprise();
    const programme = await prisma.programme.create({
      data: {
        name: "Programme triage strict 2",
        description: "d",
        entrepriseId: entreprise.entrepriseProfile.id,
        minReward: 1000,
        maxReward: 5000,
        triageTimeHours: 100,
      },
    });
    const base = new Date("2026-01-01T00:00:00Z");
    const report = await makeReport({
      hackerId: hacker.hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entreprise.entrepriseProfile.id,
      status: "accepte",
      createdAt: base,
    });
    // No payment config at all here, so the config-change branch cannot fire either.
    const payout = await makePayout({ reportId: report.id, hackerId: hacker.hackerProfile.id, createdAt: new Date(base.getTime() + 50 * 3600_000) });

    const signals = await detectPaymentAnomalies();
    const match = signals.find((s) => s.relatedPayoutId === payout.id);
    expect(match).toBeUndefined();
  });

  it("flags a payout requested shortly after the payment destination was changed", async () => {
    const hacker = await makeHacker();
    const entreprise = await makeEntreprise();
    // No triageTimeHours set, so only the config-change check can fire here.
    const programme = await createTestProgramme(entreprise.entrepriseProfile.id);
    const report = await makeReport({
      hackerId: hacker.hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entreprise.entrepriseProfile.id,
      status: "accepte",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });
    await prisma.hackerPaymentConfig.create({ data: { hackerId: hacker.hackerProfile.id, phoneNumber: "+24177000099" } });
    const payout = await makePayout({ reportId: report.id, hackerId: hacker.hackerProfile.id, createdAt: new Date() });

    const signals = await detectPaymentAnomalies();
    const match = signals.find((s) => (s.details as { changeDelayHours?: number }).changeDelayHours !== undefined && s.relatedPayoutId === payout.id);
    expect(match).toBeTruthy();
  });

  it("does not flag a payout when the payment destination was changed long before", async () => {
    const hacker = await makeHacker();
    const entreprise = await makeEntreprise();
    const programme = await createTestProgramme(entreprise.entrepriseProfile.id);
    const report = await makeReport({
      hackerId: hacker.hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entreprise.entrepriseProfile.id,
      status: "accepte",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });
    await prisma.hackerPaymentConfig.create({ data: { hackerId: hacker.hackerProfile.id, phoneNumber: "+24177000098" } });
    const payout = await makePayout({ reportId: report.id, hackerId: hacker.hackerProfile.id, createdAt: new Date("2026-06-01T00:00:00Z") });

    const signals = await detectPaymentAnomalies();
    const match = signals.find((s) => s.relatedPayoutId === payout.id);
    expect(match).toBeUndefined();
  });
});

describe("Fraud signals API", () => {
  it("rejects a caller without fraud.review from listing signals", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/fraud/signals").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("lets an admin run a scan, list signals, and update a signal's status", async () => {
    const admin = await createTestUser("admin");
    const a = await makeHacker();
    const b = await makeHacker();
    await prisma.hackerPaymentConfig.create({ data: { hackerId: a.hackerProfile.id, phoneNumber: "+24177000005" } });
    await prisma.hackerPaymentConfig.create({ data: { hackerId: b.hackerProfile.id, phoneNumber: "+24177000005" } });

    const scanRes = await request(app).post("/api/fraud/scan").set("Authorization", admin.authHeader);
    expect(scanRes.status).toBe(201);
    expect(scanRes.body.created).toBeGreaterThan(0);

    const listRes = await request(app).get("/api/fraud/signals").set("Authorization", admin.authHeader);
    expect(listRes.status).toBe(200);
    const signal = listRes.body.signals.find((s: { relatedProfileIds: string[] }) => s.relatedProfileIds.includes(a.user.id));
    expect(signal).toBeTruthy();
    expect(signal.status).toBe("open");

    const patchRes = await request(app)
      .patch(`/api/fraud/signals/${signal.id}`)
      .set("Authorization", admin.authHeader)
      .send({ status: "dismissed" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.signal.status).toBe("dismissed");
    expect(patchRes.body.signal.reviewedById).toBe(admin.id);
  });
});
