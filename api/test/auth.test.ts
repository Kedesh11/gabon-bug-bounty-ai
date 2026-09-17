import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { mailerMocks } from "./setup.js";

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

describe("POST /api/auth/forgot-password", () => {
  it("responds 200 even for an unknown email, without sending anything", async () => {
    mailerMocks.sendPasswordResetEmail.mockClear();

    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(mailerMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a reset token and emails a reset link for a known account", async () => {
    const hacker = await createTestUser("hacker");
    mailerMocks.sendPasswordResetEmail.mockClear();

    const res = await request(app).post("/api/auth/forgot-password").send({ email: hacker.email });

    expect(res.status).toBe(200);
    expect(mailerMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const { to, resetUrl } = mailerMocks.sendPasswordResetEmail.mock.calls[0][0];
    expect(to).toBe(hacker.email);
    expect(resetUrl).toContain("/reinitialiser-mot-de-passe?token=");
  });
});

describe("POST /api/auth/reset-password", () => {
  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", password: "newpassword123" });

    expect(res.status).toBe(400);
  });

  it("resets the password for a valid token, then rejects reuse of the same token", async () => {
    const hacker = await createTestUser("hacker");
    mailerMocks.sendPasswordResetEmail.mockClear();
    await request(app).post("/api/auth/forgot-password").send({ email: hacker.email });

    const resetUrl: string = mailerMocks.sendPasswordResetEmail.mock.calls[0][0].resetUrl;
    const token = new URL(resetUrl).searchParams.get("token")!;

    const resetRes = await request(app).post("/api/auth/reset-password").send({ token, password: "newpassword123" });
    expect(resetRes.status).toBe(200);

    const reuseRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "anotherpassword123" });
    expect(reuseRes.status).toBe(400);
  });
});
