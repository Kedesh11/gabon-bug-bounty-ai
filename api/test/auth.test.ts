import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { mailerMocks } from "./setup.js";
import { issuePasswordResetToken } from "../src/routes/auth.routes.js";
import { prisma } from "../src/prisma.js";

async function setPasswordComplexity(complexity: "standard" | "elevated" | "military") {
  await prisma.systemConfig.upsert({ where: { id: 1 }, update: { passwordComplexity: complexity }, create: { id: 1, passwordComplexity: complexity } });
}

describe("GET /api/auth/me", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("returns the caller's profile for a valid token", async () => {
    const hacker = await createTestUser("hacker");

    const res = await request(app).get("/api/auth/me").set("Authorization", hacker.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(hacker.id);
    expect(res.body.profile.role).toBe("hacker");
    expect(res.body.profile.hackerProfile).toBeTruthy();
  });
});

describe("PATCH /api/auth/me — notification preferences", () => {
  it("persists notification preferences for real, retrievable via GET /me", async () => {
    const hacker = await createTestUser("hacker");
    const prefs = { inAppEnabled: true, emailEnabled: true, paymentAlerts: false, reportStatusAlerts: true, securityAlerts: false };

    const patchRes = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", hacker.authHeader)
      .send({ notificationPreferences: prefs });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.profile.notificationPreferences).toEqual(prefs);

    const meRes = await request(app).get("/api/auth/me").set("Authorization", hacker.authHeader);
    expect(meRes.body.profile.notificationPreferences).toEqual(prefs);
  });
});

describe("POST /api/auth/register — password complexity", () => {
  afterEach(() => setPasswordComplexity("standard"));

  it("accepts a simple password under the default 'standard' complexity", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `complexity-standard-${Date.now()}@example.com`,
      password: "simplepass",
      name: "Test",
      role: "hacker",
    });
    expect(res.status).toBe(201);
  });

  it("rejects a password that fails the configured 'elevated' complexity", async () => {
    await setPasswordComplexity("elevated");

    const res = await request(app).post("/api/auth/register").send({
      email: `complexity-elevated-fail-${Date.now()}@example.com`,
      password: "simplepass", // 10 chars, no uppercase/digit — below elevated's requirements
      name: "Test",
      role: "hacker",
    });
    expect(res.status).toBe(400);
  });

  it("accepts a password that satisfies the configured 'elevated' complexity", async () => {
    await setPasswordComplexity("elevated");

    const res = await request(app).post("/api/auth/register").send({
      email: `complexity-elevated-ok-${Date.now()}@example.com`,
      password: "ElevatedPass1",
      name: "Test",
      role: "hacker",
    });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("responds 200 even for an unknown email, without sending anything", async () => {
    mailerMocks.sendPasswordResetEmail.mockClear();

    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(mailerMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  // The token/email work now fires without being awaited (see issuePasswordResetToken
  // in auth.routes.ts — split out precisely so it can be tested directly below), so
  // this only asserts the HTTP-visible contract: same status, same generic body.
  it("responds 200 for a known email too, with the same generic message", async () => {
    const hacker = await createTestUser("hacker");

    const res = await request(app).post("/api/auth/forgot-password").send({ email: hacker.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.");
  });
});

describe("issuePasswordResetToken — fire-and-forget target of /forgot-password", () => {
  it("creates a reset token and emails a reset link", async () => {
    const hacker = await createTestUser("hacker");
    mailerMocks.sendPasswordResetEmail.mockClear();

    const rawToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });

    expect(mailerMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const { to, resetUrl } = mailerMocks.sendPasswordResetEmail.mock.calls[0][0];
    expect(to).toBe(hacker.email);
    expect(resetUrl).toContain(`token=${rawToken}`);
  });

  it("issuing a new token invalidates the previous one for the same account", async () => {
    const hacker = await createTestUser("hacker");
    const firstToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });
    const secondToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });

    const useFirst = await request(app).post("/api/auth/reset-password").send({ token: firstToken, password: "newpassword123" });
    expect(useFirst.status).toBe(400);

    const useSecond = await request(app).post("/api/auth/reset-password").send({ token: secondToken, password: "newpassword123" });
    expect(useSecond.status).toBe(200);
  });
});

describe("POST /api/auth/reset-password", () => {
  afterEach(() => setPasswordComplexity("standard"));

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", password: "newpassword123" });

    expect(res.status).toBe(400);
  });

  it("resets the password for a valid token, then rejects reuse of the same token", async () => {
    const hacker = await createTestUser("hacker");
    const rawToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });

    const resetRes = await request(app).post("/api/auth/reset-password").send({ token: rawToken, password: "newpassword123" });
    expect(resetRes.status).toBe(200);

    const reuseRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "anotherpassword123" });
    expect(reuseRes.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const hacker = await createTestUser("hacker");
    const rawToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });
    await prisma.passwordResetToken.updateMany({
      where: { profileId: hacker.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post("/api/auth/reset-password").send({ token: rawToken, password: "newpassword123" });
    expect(res.status).toBe(400);
  });

  it("rejects a new password that fails the configured 'military' complexity", async () => {
    const hacker = await createTestUser("hacker");
    const rawToken = await issuePasswordResetToken({ id: hacker.id, email: hacker.email });
    await setPasswordComplexity("military");

    const res = await request(app).post("/api/auth/reset-password").send({ token: rawToken, password: "newpassword123" });
    expect(res.status).toBe(400);
  });
});
