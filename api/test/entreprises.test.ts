import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { prisma } from "../src/prisma.js";

describe("GET /api/entreprises/:id/top-researchers", () => {
  it("ranks hackers by accepted/resolved report reward for this entreprise only", async () => {
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const triage = await createTestUser("triage");

    const hackerA = await createTestUser("hacker");
    const hackerAProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hackerA.id } });
    const hackerB = await createTestUser("hacker");
    const hackerBProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hackerB.id } });

    // Hacker A: two accepted reports (higher total reward) — should rank first.
    for (const reward of [50000, 30000]) {
      const createRes = await request(app)
        .post("/api/reports")
        .set("Authorization", hackerA.authHeader)
        .send({ title: "Report A", description: "d", severity: "haute", programmeId: programme.id, vulnerability: "XSS", proof: "poc" });
      await request(app)
        .patch(`/api/reports/${createRes.body.report.id}`)
        .set("Authorization", triage.authHeader)
        .send({ status: "accepte", reward });
    }

    // Hacker B: one accepted report, smaller reward.
    const createResB = await request(app)
      .post("/api/reports")
      .set("Authorization", hackerB.authHeader)
      .send({ title: "Report B", description: "d", severity: "moyenne", programmeId: programme.id, vulnerability: "IDOR", proof: "poc" });
    await request(app)
      .patch(`/api/reports/${createResB.body.report.id}`)
      .set("Authorization", triage.authHeader)
      .send({ status: "accepte", reward: 10000 });

    // A submitted-but-not-yet-triaged report must not count at all.
    await request(app)
      .post("/api/reports")
      .set("Authorization", hackerB.authHeader)
      .send({ title: "Report C", description: "d", severity: "faible", programmeId: programme.id, vulnerability: "CSRF", proof: "poc" });

    const res = await request(app).get(`/api/entreprises/${entrepriseProfile.id}/top-researchers`).set("Authorization", entreprise.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.researchers).toHaveLength(2);
    expect(res.body.researchers[0].hacker.id).toBe(hackerAProfile.id);
    expect(res.body.researchers[0].totalReward).toBe(80000);
    expect(res.body.researchers[0].reportsCount).toBe(2);
    expect(res.body.researchers[1].hacker.id).toBe(hackerBProfile.id);
    expect(res.body.researchers[1].totalReward).toBe(10000);
  });

  it("refuses another entreprise's ownership check, allows staff", async () => {
    const owner = await createTestUser("entreprise");
    const ownerProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: owner.id } });
    const intruder = await createTestUser("entreprise");
    const admin = await createTestUser("admin");

    const intruderRes = await request(app)
      .get(`/api/entreprises/${ownerProfile.id}/top-researchers`)
      .set("Authorization", intruder.authHeader);
    expect(intruderRes.status).toBe(403);

    const adminRes = await request(app)
      .get(`/api/entreprises/${ownerProfile.id}/top-researchers`)
      .set("Authorization", admin.authHeader);
    expect(adminRes.status).toBe(200);
  });
});
