import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { createTestUser } from "./helpers.js";

// The limiters (middleware/rateLimit.ts) short-circuit entirely when NODE_ENV is
// "test" (set globally in test/setup.ts) — every other test file in the suite relies
// on that so repeated login/forgot-password calls elsewhere don't trip the ceiling.
// These two tests are the deliberate exception: flip NODE_ENV just long enough to
// exercise the real limiter, then always restore it, even on failure.
describe("Rate limiting on sensitive auth endpoints", () => {
  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("blocks login after repeated attempts from the same caller", async () => {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("Invalid login credentials"),
    } as never);

    process.env.NODE_ENV = "production";

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await request(app).post("/api/auth/login").send({ email: hacker.email, password: "wrong-password" });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses[10]).toBe(429);
  });

  it("blocks forgot-password after repeated requests from the same caller", async () => {
    process.env.NODE_ENV = "production";

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/api/auth/forgot-password").send({ email: "someone@example.com" });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual(Array(5).fill(200));
    expect(statuses[5]).toBe(429);
  });

  it("limits report submissions per account, not per address", async () => {
    const spammer = await createTestUser("hacker");
    const bystander = await createTestUser("hacker");
    process.env.NODE_ENV = "production";

    // An invalid body still passes through the limiter first (400, not 429) — enough to
    // count requests without creating 21 real reports.
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const res = await request(app).post("/api/reports").set("Authorization", spammer.authHeader).send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 20)).toEqual(Array(20).fill(400));
    expect(statuses[20]).toBe(429);

    // Same IP, different account: unaffected.
    const other = await request(app).post("/api/reports").set("Authorization", bystander.authHeader).send({});
    expect(other.status).toBe(400);
  });

  it("limits ticket creation and category proposals per account", async () => {
    const user = await createTestUser("hacker");
    process.env.NODE_ENV = "production";

    const tickets: number[] = [];
    for (let i = 0; i < 11; i++) {
      tickets.push((await request(app).post("/api/tickets").set("Authorization", user.authHeader).send({})).status);
    }
    expect(tickets[9]).toBe(400);
    expect(tickets[10]).toBe(429);

    const categories: number[] = [];
    for (let i = 0; i < 21; i++) {
      categories.push((await request(app).post("/api/taxonomy/vulnerability-categories").set("Authorization", user.authHeader).send({})).status);
    }
    expect(categories[19]).toBe(400);
    expect(categories[20]).toBe(429);
  });
});
