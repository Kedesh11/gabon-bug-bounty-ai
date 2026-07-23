import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { createPlatformLog, listPlatformLogs } from "../src/services/platformLogs/logsService.js";

describe("Platform logs — permission gate", () => {
  it("rejects a caller without logs.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/logs").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("allows admin and support (both have logs.view)", async () => {
    const admin = await createTestUser("admin");
    const support = await createTestUser("support");
    const adminRes = await request(app).get("/api/logs").set("Authorization", admin.authHeader);
    const supportRes = await request(app).get("/api/logs").set("Authorization", support.authHeader);
    expect(adminRes.status).toBe(200);
    expect(supportRes.status).toBe(200);
  });
});

describe("createPlatformLog / listPlatformLogs", () => {
  it("writes a log entry retrievable by GET /api/logs, filterable by userId", async () => {
    const admin = await createTestUser("admin");
    const actor = await createTestUser("triage");

    await createPlatformLog({
      type: "security",
      level: "info",
      message: "Test log entry",
      source: "logs.test",
      userId: actor.id,
      metadata: { foo: "bar" },
    });

    const res = await request(app).get(`/api/logs?userId=${actor.id}`).set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].message).toBe("Test log entry");
    expect(res.body.logs[0].userId).toBe(actor.id);
    expect(res.body.logs[0].metadata).toEqual({ foo: "bar" });
  });

  it("filters by type and level", async () => {
    const admin = await createTestUser("admin");
    const actor = await createTestUser("triage");

    await createPlatformLog({ type: "system", level: "error", message: "System error", source: "logs.test", userId: actor.id });
    await createPlatformLog({ type: "security", level: "info", message: "Security info", source: "logs.test", userId: actor.id });

    const res = await request(app)
      .get(`/api/logs?userId=${actor.id}&type=system&level=error`)
      .set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].message).toBe("System error");
  });

  it("never throws even if given bad input at the service level", async () => {
    // @ts-expect-error intentionally malformed to exercise the defensive catch
    await expect(createPlatformLog({ type: "not-a-real-type", level: "info", message: "x", source: "logs.test" })).resolves.toBeUndefined();
  });
});

describe("Real actions produce a platform log", () => {
  it("logs a role creation", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send({
        label: `Role de test ${Date.now()}`,
        permissionKeys: [],
        name: "Personne Test",
        email: `role-test-${Date.now()}@example.com`,
        password: "MotDePasse123!",
      });
    expect(res.status).toBe(201);

    const logs = await listPlatformLogs({ userId: admin.id, type: "security" });
    expect(logs.some((l) => l.message.includes(res.body.role.label))).toBe(true);
  });
});
