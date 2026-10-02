import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { cinetpayFetchMock, jsonResponse } from "./setup.js";
import { prisma } from "../src/prisma.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

beforeEach(() => {
  cinetpayFetchMock.mockReset();
});

async function setRequire2FA(value: boolean) {
  await prisma.systemConfig.upsert({ where: { id: 1 }, update: { require2FA: value }, create: { id: 1, require2FA: value } });
}

describe("GET /api/auth/mfa/status", () => {
  it("reports not enrolled by default", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/auth/mfa/status").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.enrolled).toBe(false);
  });

  it("reports enrolled when Supabase has a verified TOTP factor on file", async () => {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
      data: { user: { factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }] } },
      error: null,
    } as never);

    const res = await request(app).get("/api/auth/mfa/status").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enrolled: true, factorId: "factor-1" });
  });
});

describe("POST /api/auth/mfa/enroll", () => {
  it("forwards the caller's own token to GoTrue and returns the QR/secret", async () => {
    const hacker = await createTestUser("hacker");
    cinetpayFetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "factor-1",
        type: "totp",
        totp: { qr_code: "<svg>fake</svg>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/x" },
      }),
    );

    const res = await request(app).post("/api/auth/mfa/enroll").set("Authorization", hacker.authHeader);

    expect(res.status).toBe(201);
    expect(res.body.factorId).toBe("factor-1");
    expect(res.body.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(res.body.qrCode).toBe("data:image/svg+xml;utf-8,<svg>fake</svg>");

    const [url, init] = cinetpayFetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/v1/factors");
    expect(init.headers.Authorization).toBe(hacker.authHeader);
  });

  it("clears out a stale unverified factor before enrolling again (retry after cancelling)", async () => {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
      data: { user: { factors: [{ id: "stale-factor", factor_type: "totp", status: "unverified" }] } },
      error: null,
    } as never);
    cinetpayFetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "stale-factor" })) // DELETE of the stale factor
      .mockResolvedValueOnce(
        jsonResponse({ id: "factor-2", type: "totp", totp: { qr_code: "<svg/>", secret: "SECRET2", uri: "otpauth://totp/y" } }),
      );

    const res = await request(app).post("/api/auth/mfa/enroll").set("Authorization", hacker.authHeader);

    expect(res.status).toBe(201);
    expect(res.body.factorId).toBe("factor-2");
    expect(cinetpayFetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(String(cinetpayFetchMock.mock.calls[0][0])).toContain("/factors/stale-factor");
  });
});

describe("POST /api/auth/mfa/enroll/confirm", () => {
  it("challenges then verifies, returning the promoted aal2 session", async () => {
    const hacker = await createTestUser("hacker");
    cinetpayFetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "challenge-1", expires_at: Math.floor(Date.now() / 1000) + 60 }))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "new-aal2-token", refresh_token: "new-refresh", expires_in: 3600, token_type: "bearer" }),
      );

    const res = await request(app)
      .post("/api/auth/mfa/enroll/confirm")
      .set("Authorization", hacker.authHeader)
      .send({ factorId: "factor-1", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.session.access_token).toBe("new-aal2-token");
    expect(res.body.session.refresh_token).toBe("new-refresh");
    expect(cinetpayFetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces GoTrue's rejection of a wrong code as a client error, translated to French", async () => {
    const hacker = await createTestUser("hacker");
    cinetpayFetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "challenge-1", expires_at: Math.floor(Date.now() / 1000) + 60 }))
      .mockResolvedValueOnce(jsonResponse({ msg: "Invalid TOTP code entered" }, false));

    const res = await request(app)
      .post("/api/auth/mfa/enroll/confirm")
      .set("Authorization", hacker.authHeader)
      .send({ factorId: "factor-1", code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Code invalide ou expiré");
  });
});

describe("DELETE /api/auth/mfa/factors/:factorId", () => {
  it("unenrolls the factor", async () => {
    const hacker = await createTestUser("hacker");
    cinetpayFetchMock.mockResolvedValueOnce(jsonResponse({ id: "factor-1" }));

    const res = await request(app).delete("/api/auth/mfa/factors/factor-1").set("Authorization", hacker.authHeader);

    expect(res.status).toBe(204);
    const [url, init] = cinetpayFetchMock.mock.calls[0];
    expect(String(url)).toContain("/factors/factor-1");
    expect(init.method).toBe("DELETE");
  });
});

describe("POST /api/auth/login — MFA step-up", () => {
  it("responds mfaRequired instead of a full session when the account has a verified TOTP factor", async () => {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        session: { access_token: "aal1-token", refresh_token: "aal1-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600 },
        user: { id: hacker.id, factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }] },
      },
      error: null,
    } as never);

    const res = await request(app).post("/api/auth/login").send({ email: hacker.email, password: "whatever123" });

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.factorId).toBe("factor-1");
    expect(res.body.aal1AccessToken).toBe("aal1-token");
    expect(res.body.session).toBeUndefined();
    expect(res.body.profile).toBeUndefined();
  });
});

describe("POST /api/auth/mfa/login-verify", () => {
  it("completes the step-up login and returns a real profile + session", async () => {
    const hacker = await createTestUser("hacker");
    cinetpayFetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "challenge-1", expires_at: Math.floor(Date.now() / 1000) + 60 }))
      .mockResolvedValueOnce(
        // access_token deliberately reuses the test harness's own registered token
        // (hacker.token) so the mocked supabaseAdmin.auth.getUser() call right after
        // resolves to a real profile, same as any other authenticated test call.
        jsonResponse({ access_token: hacker.token, refresh_token: "post-mfa-refresh", expires_in: 3600, token_type: "bearer" }),
      );

    const res = await request(app)
      .post("/api/auth/mfa/login-verify")
      .send({ factorId: "factor-1", code: "123456", aal1AccessToken: "aal1-token" });

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(hacker.id);
    expect(res.body.session.access_token).toBe(hacker.token);
  });

  it("rejects a wrong code", async () => {
    cinetpayFetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "challenge-1", expires_at: Math.floor(Date.now() / 1000) + 60 }))
      .mockResolvedValueOnce(jsonResponse({ msg: "Invalid TOTP code entered" }, false));

    const res = await request(app)
      .post("/api/auth/mfa/login-verify")
      .send({ factorId: "factor-1", code: "000000", aal1AccessToken: "aal1-token" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me — MFA fields", () => {
  it("reports mfaEnabled true when a verified TOTP factor exists", async () => {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValueOnce({
      data: { user: { factors: [{ id: "factor-1", factor_type: "totp", status: "verified" }] } },
      error: null,
    } as never);

    const res = await request(app).get("/api/auth/me").set("Authorization", hacker.authHeader);
    expect(res.body.mfaEnabled).toBe(true);
    expect(res.body.mfaEnrollmentRequired).toBe(false);
  });

  it("never flags mfaEnrollmentRequired for a hacker, even with require2FA on", async () => {
    await setRequire2FA(true);
    const hacker = await createTestUser("hacker");

    const res = await request(app).get("/api/auth/me").set("Authorization", hacker.authHeader);
    expect(res.body.mfaEnrollmentRequired).toBe(false);

    await setRequire2FA(false);
  });

  it("flags mfaEnrollmentRequired for an unenrolled entreprise account once require2FA is on", async () => {
    await setRequire2FA(true);
    const entreprise = await createTestUser("entreprise");

    const res = await request(app).get("/api/auth/me").set("Authorization", entreprise.authHeader);
    expect(res.body.mfaEnrollmentRequired).toBe(true);

    await setRequire2FA(false);
  });

  it("does not flag a staff role without settings.view (e.g. triage) — no page exists for them to act on it", async () => {
    await setRequire2FA(true);
    const triage = await createTestUser("triage");

    const res = await request(app).get("/api/auth/me").set("Authorization", triage.authHeader);
    expect(res.body.mfaEnrollmentRequired).toBe(false);

    await setRequire2FA(false);
  });
});

describe("Second factor cannot be skipped with the aal1 token from /login", () => {
  const fakeJwt = (aal: string) =>
    `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ aal })).toString("base64url")}.sig`;

  async function callMeWith(aal: string, factors: unknown[]) {
    const hacker = await createTestUser("hacker");
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({ data: { user: { id: hacker.id, factors } }, error: null } as never);
    return request(app).get("/api/auth/me").set("Authorization", `Bearer ${fakeJwt(aal)}`);
  }

  const verifiedTotp = [{ id: "f1", factor_type: "totp", status: "verified" }];

  it("refuses an aal1 token for an account with a verified TOTP factor", async () => {
    const res = await callMeWith("aal1", verifiedTotp);
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("deux étapes");
  });

  it("accepts the aal2 token of that same account", async () => {
    expect((await callMeWith("aal2", verifiedTotp)).status).toBe(200);
  });

  it("does not demand aal2 from an account with no verified factor, nor one mid-enrollment", async () => {
    expect((await callMeWith("aal1", [])).status).toBe(200);
    expect((await callMeWith("aal1", [{ id: "f2", factor_type: "totp", status: "unverified" }])).status).toBe(200);
  });
});
