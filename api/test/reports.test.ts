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
