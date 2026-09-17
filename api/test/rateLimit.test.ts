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
});
