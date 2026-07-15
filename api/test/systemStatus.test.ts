import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { stripeMocks } from "./setup.js";

beforeEach(() => {
  stripeMocks.checkoutSessionsList.mockReset();
});

describe("GET /api/system-status", () => {
  it("rejects a non-admin", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/system-status").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("reports every dependency online when the underlying checks succeed", async () => {
    const admin = await createTestUser("admin");
    stripeMocks.checkoutSessionsList.mockResolvedValue({});

    const res = await request(app).get("/api/system-status").set("Authorization", admin.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.database).toBe("online");
    expect(res.body.auth).toBe("online");
    expect(res.body.payments).toBe("online");
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("reports payments offline when the Stripe check fails", async () => {
    const admin = await createTestUser("admin");
    stripeMocks.checkoutSessionsList.mockRejectedValue(new Error("stripe unreachable"));

    const res = await request(app).get("/api/system-status").set("Authorization", admin.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.payments).toBe("offline");
    expect(res.body.database).toBe("online");
  });
});
