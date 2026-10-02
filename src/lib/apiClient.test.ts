import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, setSessionHint, hasSessionHint, ApiError } from "./apiClient";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch with cookie sessions", () => {
  it("sends cookies and the CSRF header, and never an Authorization header", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await apiFetch("/api/auth/me");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.headers["X-Requested-With"]).toBe("bb-web");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("refreshes once on a 401 when a session is expected, then replays the request", async () => {
    setSessionHint(true);
    fetchMock
      .mockResolvedValueOnce(json(401, { error: "Token invalide ou expiré" }))
      .mockResolvedValueOnce(json(200, { refreshed: true }))
      .mockResolvedValueOnce(json(200, { data: 42 }));

    await expect(apiFetch("/api/reports")).resolves.toEqual({ data: 42 });
    expect(fetchMock.mock.calls[1][0]).toContain("/api/auth/refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shares a single refresh between concurrent 401s", async () => {
    setSessionHint(true);
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1;
        return json(200, { refreshed: true });
      }
      // First attempt of each request is rejected, replay succeeds.
      const seen = (fetchMock.mock.calls as unknown[][]).filter((c) => c[0] === url).length;
      return seen <= 1 ? json(401, { error: "expired" }) : json(200, { url });
    });

    await Promise.all([apiFetch("/api/a"), apiFetch("/api/b")]);
    expect(refreshCalls).toBe(1);
  });

  it("drops the session hint and surfaces the 401 when the refresh is refused", async () => {
    setSessionHint(true);
    fetchMock.mockResolvedValueOnce(json(401, { error: "expired" })).mockResolvedValueOnce(json(401, { error: "Session expirée" }));

    await expect(apiFetch("/api/reports")).rejects.toMatchObject({ status: 401 });
    expect(hasSessionHint()).toBe(false);
  });

  it("does not try to refresh when no session is expected (e.g. a wrong password on /login)", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: "Email ou mot de passe invalide" }));

    await expect(apiFetch("/api/auth/login", { method: "POST", body: { email: "a@b.c", password: "x" } })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps no token anywhere in storage", async () => {
    setSessionHint(true);
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/token/i);
  });
});
