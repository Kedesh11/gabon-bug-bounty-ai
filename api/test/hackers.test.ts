import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";

// listHackers()/listHackerLeaderboard() rank against the WHOLE table, so — like
// fraud.test.ts's heuristics — these tests are sensitive to hackers left over from
// earlier test runs against this persistent dev database. No other test file
// depends on pre-existing hacker rows, so a one-time wipe here is safe.
beforeAll(async () => {
  await prisma.hackerProfile.deleteMany({});
});

async function setReputation(profileId: string, reputation: number) {
  const hacker = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId } });
  return prisma.hackerProfile.update({ where: { id: hacker.id }, data: { reputation } });
}

describe("Hacker leaderboard ranking (automatic, computed from reputation)", () => {
  it("ranks hackers by reputation, ties sharing a rank that the next distinct value skips past", async () => {
    const admin = await createTestUser("admin");
    const a = await createTestUser("hacker");
    const b = await createTestUser("hacker");
    const c = await createTestUser("hacker");
    await setReputation(a.id, 500);
    await setReputation(b.id, 500);
    await setReputation(c.id, 200);

    const res = await request(app).get("/api/hackers").set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);

    const byProfileId: Record<string, { rank: number; reputation: number }> = Object.fromEntries(
      res.body.hackers.map((h: { profile: { id: string }; rank: number; reputation: number }) => [h.profile.id, h]),
    );
    expect(byProfileId[a.id].rank).toBe(byProfileId[b.id].rank);
    expect(byProfileId[c.id].rank).toBe(byProfileId[a.id].rank + 2); // competition ranking: 1,1,3 not 1,1,2
  });

  it("does not let an admin set rank manually via PATCH — the field is silently ignored", async () => {
    const admin = await createTestUser("admin");
    const hacker = await createTestUser("hacker");
    const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });

    const res = await request(app)
      .patch(`/api/hackers/${hackerProfile.id}`)
      .set("Authorization", admin.authHeader)
      .send({ rank: 1 });
    expect(res.status).toBe(200);
    expect(res.body.hacker.rank).toBeUndefined();

    const stored = await prisma.hackerProfile.findUniqueOrThrow({ where: { id: hackerProfile.id } });
    expect(stored).not.toHaveProperty("rank");
  });

  it("computes the correct rank for a single hacker fetched by id", async () => {
    const admin = await createTestUser("admin");
    const top = await createTestUser("hacker");
    const middle = await createTestUser("hacker");
    await setReputation(top.id, 9999);
    await setReputation(middle.id, 100);
    const topProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: top.id } });

    const res = await request(app).get(`/api/hackers/${topProfile.id}`).set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.hacker.rank).toBe(1);
  });
});

describe("Public hacker leaderboard", () => {
  it("is readable without authentication and excludes PII (no email)", async () => {
    const res = await request(app).get("/api/hackers/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hackers)).toBe(true);
    for (const entry of res.body.hackers) {
      expect(entry.profile.email).toBeUndefined();
      expect(typeof entry.rank).toBe("number");
      expect(typeof entry.criticalBugsCount).toBe("number");
    }
  });

  it("excludes suspended/banned hackers", async () => {
    const admin = await createTestUser("admin");
    const banned = await createTestUser("hacker");
    const bannedProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: banned.id } });
    await request(app)
      .patch(`/api/hackers/${bannedProfile.id}`)
      .set("Authorization", admin.authHeader)
      .send({ status: "banni" });

    const res = await request(app).get("/api/hackers/leaderboard");
    expect(res.body.hackers.some((h: { id: string }) => h.id === bannedProfile.id)).toBe(false);
  });

  it("counts only accepted/resolved critical reports for a hacker", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await prisma.programme.create({
      data: { name: "Prog critique", description: "d", entrepriseId: entrepriseProfile.id, minReward: 1000, maxReward: 5000 },
    });
    const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });

    await prisma.report.create({
      data: {
        title: "Critique acceptée", description: "d", severity: "critique", status: "accepte",
        hackerId: hackerProfile.id, programmeId: programme.id, entrepriseId: entrepriseProfile.id,
        vulnerability: "RCE", proof: "poc",
      },
    });
    await prisma.report.create({
      data: {
        title: "Critique non décidée", description: "d", severity: "critique", status: "soumis",
        hackerId: hackerProfile.id, programmeId: programme.id, entrepriseId: entrepriseProfile.id,
        vulnerability: "RCE", proof: "poc",
      },
    });

    const res = await request(app).get("/api/hackers/leaderboard");
    const entry = res.body.hackers.find((h: { id: string }) => h.id === hackerProfile.id);
    expect(entry.criticalBugsCount).toBe(1);
  });
});

describe("PATCH /api/hackers/me — bio/social fields", () => {
  it("saves bio, githubHandle and twitterHandle for real, previously silently dropped", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .patch("/api/hackers/me")
      .set("Authorization", hacker.authHeader)
      .send({ bio: "Chercheur en sécurité web.", githubHandle: "jdupont", twitterHandle: "jdupont_sec" });
    expect(res.status).toBe(200);
    expect(res.body.hacker.bio).toBe("Chercheur en sécurité web.");
    expect(res.body.hacker.githubHandle).toBe("jdupont");
    expect(res.body.hacker.twitterHandle).toBe("jdupont_sec");
  });
});
