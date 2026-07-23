import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

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
