import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { prisma } from "../src/prisma.js";

describe("Reports RBAC & CRUD", () => {
  it("lets a hacker submit a report and generates a placeholder AI analysis", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "XSS réfléchi sur /login",
        description: "Injection XSS via le paramètre redirect_url",
        severity: "haute",
        programmeId: programme.id,
        vulnerability: "XSS",
        proof: "URL: /login?redirect=javascript:alert(1)",
      });

    expect(res.status).toBe(201);
    expect(res.body.report.status).toBe("soumis");
    expect(res.body.report.reward).toBe(0);
    expect(res.body.report.aiAnalysis).toBeTruthy();
    expect(res.body.report.aiAnalysis.confidence).toBeGreaterThan(0);
  });

  it("rejects report creation for an entreprise", async () => {
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", entreprise.authHeader)
      .send({
        title: "Test",
        description: "desc",
        severity: "faible",
        programmeId: programme.id,
        vulnerability: "XSS",
        proof: "poc",
      });

    expect(res.status).toBe(403);
  });

  it("lets triage update a report's status but not a hacker", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const triage = await createTestUser("triage");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const createRes = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "SQLi",
        description: "desc",
        severity: "critique",
        programmeId: programme.id,
        vulnerability: "SQLi",
        proof: "poc",
      });
    const reportId = createRes.body.report.id;

    const hackerPatch = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set("Authorization", hacker.authHeader)
      .send({ status: "accepte", reward: 500000 });
    expect(hackerPatch.status).toBe(403);

    const triagePatch = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set("Authorization", triage.authHeader)
      .send({ status: "accepte", reward: 500000 });
    expect(triagePatch.status).toBe(200);
    expect(triagePatch.body.report.status).toBe("accepte");
    expect(triagePatch.body.report.reward).toBe(500000);
  });
});

describe("Real SLA timestamps (triagedAt/resolvedAt)", () => {
  it("stamps triagedAt once, on the first triage decision, and never again", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const triage = await createTestUser("triage");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const createRes = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({ title: "SLA Test Report", description: "d", severity: "haute", programmeId: programme.id, vulnerability: "XSS", proof: "poc" });
    const reportId = createRes.body.report.id;
    expect(createRes.body.report.triagedAt).toBeNull();
    expect(createRes.body.report.resolvedAt).toBeNull();

    const acceptRes = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set("Authorization", triage.authHeader)
      .send({ status: "accepte", reward: 1000 });
    expect(acceptRes.body.report.triagedAt).toBeTruthy();
    const firstTriagedAt = acceptRes.body.report.triagedAt;

    // A later, unrelated edit must not move triagedAt — unlike updatedAt.
    await new Promise((r) => setTimeout(r, 5));
    const editRes = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set("Authorization", triage.authHeader)
      .send({ reward: 2000 });
    expect(editRes.body.report.triagedAt).toBe(firstTriagedAt);

    const resolveRes = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set("Authorization", triage.authHeader)
      .send({ status: "resolu" });
    expect(resolveRes.body.report.resolvedAt).toBeTruthy();
    expect(resolveRes.body.report.triagedAt).toBe(firstTriagedAt);
  });
});

describe("First-to-report duplicate detection", () => {
  async function categoryId(key: string) {
    const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key } });
    return category.id;
  }

  it("flags a later report on the same programme/category/asset as a duplicate of the earlier one", async () => {
    const hacker1 = await createTestUser("hacker");
    const hacker2 = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const xssStored = await categoryId("xss.stored");

    const first = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker1.authHeader)
      .send({
        title: "XSS stocké sur /profile",
        description: "Injection XSS stockée via le champ bio",
        severity: "haute",
        programmeId: programme.id,
        vulnerability: "XSS",
        proof: "poc",
        vulnerabilityCategoryId: xssStored,
        affectedAsset: "app.gabon.ga",
      });
    expect(first.status).toBe(201);
    expect(first.body.report.aiAnalysis.isDuplicate).toBe(false);

    const second = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker2.authHeader)
      .send({
        title: "Même XSS stocké, découvert indépendamment",
        description: "Injection XSS stockée via le même champ bio",
        severity: "haute",
        programmeId: programme.id,
        vulnerability: "XSS",
        proof: "poc",
        vulnerabilityCategoryId: xssStored,
        // Whitespace/case variation on purpose: normalization should still catch it.
        affectedAsset: "  APP.gabon.ga  ",
      });
    expect(second.status).toBe(201);
    expect(second.body.report.aiAnalysis.isDuplicate).toBe(true);
    expect(second.body.report.aiAnalysis.duplicateOfId).toBe(first.body.report.id);
  });

  it("does not flag reports on a different programme, a different category, or a different asset", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programmeA = await createTestProgramme(entrepriseProfile.id);
    const programmeB = await createTestProgramme(entrepriseProfile.id);
    const xssStored = await categoryId("xss.stored");
    const sqlInjection = await categoryId("injection.sql");

    const base = {
      title: "Report de base",
      description: "Description de base",
      severity: "moyenne" as const,
      vulnerability: "XSS",
      proof: "poc",
      vulnerabilityCategoryId: xssStored,
      affectedAsset: "shared-asset.gabon.ga",
    };

    const original = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({ ...base, programmeId: programmeA.id });
    expect(original.body.report.aiAnalysis.isDuplicate).toBe(false);

    const differentProgramme = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({ ...base, programmeId: programmeB.id });
    expect(differentProgramme.body.report.aiAnalysis.isDuplicate).toBe(false);

    const differentCategory = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({ ...base, programmeId: programmeA.id, vulnerabilityCategoryId: sqlInjection });
    expect(differentCategory.body.report.aiAnalysis.isDuplicate).toBe(false);

    const differentAsset = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({ ...base, programmeId: programmeA.id, affectedAsset: "other-asset.gabon.ga" });
    expect(differentAsset.body.report.aiAnalysis.isDuplicate).toBe(false);
  });

  it("never flags the first (earliest) report as a duplicate even after later ones arrive", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const rce = await categoryId("rce");

    const first = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "RCE via upload",
        description: "desc",
        severity: "critique",
        programmeId: programme.id,
        vulnerability: "RCE",
        proof: "poc",
        vulnerabilityCategoryId: rce,
        affectedAsset: "upload.gabon.ga",
      });

    await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "RCE via upload (rapport 2)",
        description: "desc",
        severity: "critique",
        programmeId: programme.id,
        vulnerability: "RCE",
        proof: "poc",
        vulnerabilityCategoryId: rce,
        affectedAsset: "upload.gabon.ga",
      });

    const firstReloaded = await request(app)
      .get(`/api/reports/${first.body.report.id}`)
      .set("Authorization", hacker.authHeader);
    expect(firstReloaded.body.report.aiAnalysis.isDuplicate).toBe(false);
  });
});
