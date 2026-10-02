import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { createTestUser } from "./helpers.js";

const WEB_HEADERS = { "X-Requested-With": "bb-web" };

function cookiesOf(res: request.Response): string[] {
  return (res.headers["set-cookie"] ?? []) as unknown as string[];
}

describe("Session in httpOnly cookies", () => {
  it("login sets httpOnly access + refresh cookies and does not put the tokens in the body", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).post("/api/auth/login").send({ email: hacker.email, password: "whatever" });

    expect(res.status).toBe(200);
    expect(res.body.session).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("mock-access-token");

    const cookies = cookiesOf(res);
    const access = cookies.find((c) => c.startsWith("bb_at="))!;
    const refresh = cookies.find((c) => c.startsWith("bb_rt="))!;
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Lax/i);
    expect(access).toContain("Path=/;");
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toContain("Path=/api/auth");
  });

  it("authenticates a request from the access cookie alone", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/auth/me").set("Cookie", `bb_at=${hacker.token}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(hacker.id);
  });

  it("an explicit Bearer header still works and wins over the cookie", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/auth/me").set("Authorization", hacker.authHeader).set("Cookie", "bb_at=garbage");
    expect(res.status).toBe(200);
  });

  it("refreshes from the refresh cookie and rotates both cookies", async () => {
    vi.mocked(supabaseAdmin.auth.refreshSession).mockResolvedValueOnce({
      data: { session: { access_token: "fresh-at", refresh_token: "fresh-rt", expires_in: 3600 } },
      error: null,
    } as never);

    const res = await request(app).post("/api/auth/refresh").set("Cookie", "bb_rt=old-rt").set(WEB_HEADERS).send({});

    expect(res.status).toBe(200);
    expect(vi.mocked(supabaseAdmin.auth.refreshSession)).toHaveBeenLastCalledWith({ refresh_token: "old-rt" });
    expect(cookiesOf(res).join(";")).toContain("bb_at=fresh-at");
    expect(cookiesOf(res).join(";")).toContain("bb_rt=fresh-rt");
  });

  it("clears the cookies when the refresh token is rejected", async () => {
    vi.mocked(supabaseAdmin.auth.refreshSession).mockResolvedValueOnce({ data: { session: null }, error: new Error("expired") } as never);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", "bb_rt=dead").set(WEB_HEADERS).send({});
    expect(res.status).toBe(401);
    expect(cookiesOf(res).join(";")).toMatch(/bb_rt=;/);
  });

  it("logout clears both cookies", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).post("/api/auth/logout").set("Cookie", `bb_at=${hacker.token}`).set(WEB_HEADERS);
    expect(res.status).toBe(204);
    const cleared = cookiesOf(res).join(";");
    expect(cleared).toMatch(/bb_at=;/);
    expect(cleared).toMatch(/bb_rt=;/);
  });
});

describe("CSRF protection", () => {
  it("refuses a state-changing request authenticated by cookie without the custom header", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).patch("/api/auth/me").set("Cookie", `bb_at=${hacker.token}`).send({ name: "Pirate" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("CSRF");
  });

  it("accepts it with the custom header", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).patch("/api/auth/me").set("Cookie", `bb_at=${hacker.token}`).set(WEB_HEADERS).send({ name: "Légitime" });
    expect(res.status).toBe(200);
  });

  it("refuses a state-changing request from a foreign Origin, even with the header", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", `bb_at=${hacker.token}`)
      .set(WEB_HEADERS)
      .set("Origin", "https://evil.example")
      .send({ name: "Pirate" });
    expect(res.status).toBe(403);
  });

  it("also blocks a cross-origin login (login CSRF)", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).post("/api/auth/login").set("Origin", "https://evil.example").send({ email: hacker.email, password: "x" });
    expect(res.status).toBe(403);
  });

  it("lets the real frontend origin through", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", `bb_at=${hacker.token}`)
      .set(WEB_HEADERS)
      .set("Origin", "http://localhost:8080")
      .send({ name: "Légitime" });
    expect(res.status).toBe(200);
  });

  it("never blocks safe methods, nor Bearer-authenticated API calls, nor cookie-less requests", async () => {
    const hacker = await createTestUser("hacker");
    expect((await request(app).get("/api/auth/me").set("Cookie", `bb_at=${hacker.token}`)).status).toBe(200);
    expect((await request(app).patch("/api/auth/me").set("Authorization", hacker.authHeader).send({ name: "Via Bearer" })).status).toBe(200);
    expect((await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" })).status).toBe(200);
  });

  it("answers the CORS preflight with credentials allowed for the frontend origin only", async () => {
    const res = await request(app)
      .options("/api/auth/me")
      .set("Origin", "http://localhost:8080")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "x-requested-with,content-type");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:8080");
  });
});
