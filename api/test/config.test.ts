import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";

afterEach(async () => {
  await prisma.systemConfig.update({ where: { id: 1 }, data: { maintenanceMode: false, maintenanceUntil: null } });
});

describe("GET /api/config/public", () => {
  it("returns only the platform name, no auth required", async () => {
    const res = await request(app).get("/api/config/public");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ platformName: expect.any(String) });
  });
});

describe("PATCH /api/config — maintenance mode", () => {
  it("rejects a non-admin", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .patch("/api/config")
      .set("Authorization", hacker.authHeader)
      .send({ maintenanceMode: true, maintenanceDurationHours: 2 });
    expect(res.status).toBe(403);
  });

  it("rejects turning maintenance on without a duration", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app).patch("/api/config").set("Authorization", admin.authHeader).send({ maintenanceMode: true });
    expect(res.status).toBe(400);
  });

  it("rejects a duration over 24 hours", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app)
      .patch("/api/config")
      .set("Authorization", admin.authHeader)
      .send({ maintenanceMode: true, maintenanceDurationHours: 25 });
    expect(res.status).toBe(400);
  });

  it("activates maintenance and computes maintenanceUntil server-side", async () => {
    const admin = await createTestUser("admin");
    const before = Date.now();
    const res = await request(app)
      .patch("/api/config")
      .set("Authorization", admin.authHeader)
      .send({ maintenanceMode: true, maintenanceDurationHours: 2 });

    expect(res.status).toBe(200);
    expect(res.body.config.maintenanceMode).toBe(true);
    const until = new Date(res.body.config.maintenanceUntil).getTime();
    expect(until).toBeGreaterThan(before + 2 * 60 * 60 * 1000 - 5000);
    expect(until).toBeLessThan(before + 2 * 60 * 60 * 1000 + 5000);
  });

  it("clears maintenanceUntil when turning maintenance off", async () => {
    const admin = await createTestUser("admin");
    await request(app)
      .patch("/api/config")
      .set("Authorization", admin.authHeader)
      .send({ maintenanceMode: true, maintenanceDurationHours: 1 });

    const res = await request(app).patch("/api/config").set("Authorization", admin.authHeader).send({ maintenanceMode: false });
    expect(res.status).toBe(200);
    expect(res.body.config.maintenanceMode).toBe(false);
    expect(res.body.config.maintenanceUntil).toBeNull();
  });
});

describe("GET /api/maintenance-status", () => {
  it("reports inactive with no token when maintenance is off", async () => {
    const res = await request(app).get("/api/maintenance-status");
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(res.body.maintenanceUntil).toBeNull();
  });

  it("reports active once an admin turns maintenance on", async () => {
    const admin = await createTestUser("admin");
    await request(app)
      .patch("/api/config")
      .set("Authorization", admin.authHeader)
      .send({ maintenanceMode: true, maintenanceDurationHours: 1 });

    const res = await request(app).get("/api/maintenance-status");
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.maintenanceUntil).not.toBeNull();
  });
});

describe("GET /api/config/integrations", () => {
  it("rejects a caller without settings.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/config/integrations").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("reports real configuration booleans, never secret values", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app).get("/api/config/integrations").set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    const { integrations } = res.body;
    // Forced by test/setup.ts, so these are deterministic regardless of environment.
    expect(integrations.cinetpayCheckout).toBe(true);
    expect(integrations.cinetpayTransfer).toBe(true);
    expect(integrations.stripe).toBe(true);
    expect(integrations.resend).toBe(false);
    expect(typeof integrations.openrouter).toBe("boolean");
    expect(JSON.stringify(res.body)).not.toMatch(/sk-|whsec_|re_/);
  });
});
