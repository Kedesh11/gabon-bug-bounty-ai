import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { env } from "../src/env.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { cinetpayFetchMock, jsonResponse } from "./setup.js";
import { prisma } from "../src/prisma.js";
import { resetPvitSecretCache } from "../src/services/payments/pvit/client.js";
import { pvitReference, toPvitMsisdn, toPvitOperator } from "../src/services/payments/pvit/identifiers.js";
import { reconcilePendingPvit } from "../src/services/payments/pvit/sync.js";

const PVIT = {
  MOBILE_MONEY_PROVIDER: "pvit",
  PVIT_OPERATION_ACCOUNT_CODE: "ACC_TEST",
  PVIT_SECRET_PASSWORD: "s3cret-password",
  PVIT_RENEW_SECRET_URL: "https://pvit.test/v2/RSEC/renew-secret",
  PVIT_PAYMENT_URL: "https://pvit.test/v2/PAY/rest",
  PVIT_STATUS_URL: "https://pvit.test/STAT/status",
  PVIT_BALANCE_URL: "https://pvit.test/BAL/balance",
  PVIT_CALLBACK_URL_CODE: "CBCODE123456",
  PVIT_CALLBACK_IP_ALLOWLIST: "",
} as const;

const mutableEnv = env as unknown as Record<string, unknown>;
let saved: Record<string, unknown> = {};

beforeEach(() => {
  saved = Object.fromEntries(Object.keys(PVIT).map((k) => [k, mutableEnv[k]]));
  Object.assign(mutableEnv, PVIT);
  resetPvitSecretCache();
  cinetpayFetchMock.mockReset();
});

afterEach(() => {
  Object.assign(mutableEnv, saved);
});

interface Call { url: string; method: string; headers: Record<string, string>; body: unknown }
interface Handlers {
  renew?: () => unknown;
  payment?: (body: Record<string, string | number>) => { ok?: boolean; status?: number; body: unknown } | "throw";
  status?: (query: URLSearchParams) => { ok?: boolean; status?: number; body: unknown } | "throw";
  balance?: () => unknown;
}

// Routes every outgoing PVit call by URL so tests don't depend on call order.
function mockPvit(handlers: Handlers = {}) {
  const calls: Call[] = [];
  const reply = (r: { ok?: boolean; status?: number; body: unknown }) => ({ ok: r.ok ?? true, status: r.status ?? 200, json: () => Promise.resolve(r.body) });
  cinetpayFetchMock.mockImplementation(async (input: unknown, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init?.body;
    calls.push({ url, method: init?.method ?? "GET", headers: init?.headers ?? {}, body });
    if (url.includes("/renew-secret")) return jsonResponse(handlers.renew?.() ?? { operation_account_code: "ACC_TEST", secret: "sk_live_abc", expires_in: 3600 });
    if (url.includes("/PAY/rest")) {
      const out = handlers.payment?.(body as Record<string, string | number>) ?? { body: { status: "PENDING", status_code: "200", reference_id: "PAY0001", merchant_reference_id: (body as { reference: string }).reference } };
      if (out === "throw") throw new Error("network down");
      return reply(out);
    }
    if (url.includes("/STAT/status")) {
      const out = handlers.status?.(new URL(url).searchParams) ?? { body: { status: "PENDING" } };
      if (out === "throw") throw new Error("network down");
      return reply(out);
    }
    if (url.includes("/BAL/balance")) return jsonResponse(handlers.balance?.() ?? { balance: 10_000_000, merchant_operation_account_code: "ACC_TEST" });
    throw new Error(`unexpected PVit call: ${url}`);
  });
  return calls;
}

describe("PVit identifiers", () => {
  it("builds references that fit PVit's 20-character alphanumeric limit, unique per attempt", () => {
    const id = "0b24e6d3-1a77-4c9d-9f0e-5c0a744aaaaa";
    const first = pvitReference("P", id, 1);
    expect(first).toMatch(/^[A-Za-z0-9]{1,20}$/);
    expect(pvitReference("P", id, 1)).toBe(first);
    expect(pvitReference("P", id, 2)).not.toBe(first);
    expect(pvitReference("C", id, 1)).not.toBe(first);
    expect(pvitReference("P", id, 12345).length).toBeLessThanOrEqual(20);
  });

  it("normalises Gabonese numbers to PVit's national format and rejects the unusable", () => {
    expect(toPvitMsisdn("+24177123456")).toBe("077123456");
    expect(toPvitMsisdn("+241 077 12 34 56")).toBe("077123456");
    expect(toPvitMsisdn("077123456")).toBe("077123456");
    expect(toPvitMsisdn("+2417123456")).toBeNull(); // legacy 7-digit number
    expect(toPvitMsisdn("abc")).toBeNull();
    expect(toPvitMsisdn(null)).toBeNull();
  });

  it("maps only the operators PVit serves in Gabon", () => {
    expect(toPvitOperator("airtel")).toBe("AIRTEL_MONEY");
    expect(toPvitOperator("moov")).toBe("MOOV_MONEY");
    expect(toPvitOperator("mtn")).toBeNull();
    expect(toPvitOperator("orange")).toBeNull();
  });
});

describe("PVit secret key", () => {
  it("renews the key once, sends it as X-Secret, and reuses it", async () => {
    const calls = mockPvit({ balance: () => ({ balance: 1 }) });
    const { getPvitBalance } = await import("../src/services/payments/pvit/status.js");
    await getPvitBalance();
    await getPvitBalance();

    expect(calls.filter((c) => c.url.includes("/renew-secret"))).toHaveLength(1);
    const business = calls.filter((c) => c.url.includes("/BAL/balance"));
    expect(business).toHaveLength(2);
    expect(business[0].headers["X-Secret"]).toBe("sk_live_abc");
    expect(String(business[0].url)).toContain("accountOperationCode=ACC_TEST");
    expect(calls[0].body).toEqual({ operationAccountCode: "ACC_TEST", password: "s3cret-password" });
  });

  it("renews and replays once when PVit answers 401, and never puts the password or key in an error", async () => {
    let first = true;
    const calls = mockPvit({
      renew: () => ({ secret: first ? "old-key" : "new-key", expires_in: 3600 }),
      status: () => {
        if (first) {
          first = false;
          return { ok: false, status: 401, body: { error: "expired" } };
        }
        return { body: { status: "SUCCESS", amount: 5, merchant_reference_id: "X" } };
      },
    });
    const { getPvitTransactionStatus } = await import("../src/services/payments/pvit/status.js");

    const result = await getPvitTransactionStatus("PAY1", "PAYMENT");
    expect(result?.outcome).toBe("succeeded");
    expect(calls.filter((c) => c.url.includes("/renew-secret"))).toHaveLength(2);

    resetPvitSecretCache();
    mockPvit({ renew: () => ({ error: "bad" }) });
    await expect(getPvitTransactionStatus("PAY1", "PAYMENT")).rejects.toThrow(/renouvellement/);
    await expect(getPvitTransactionStatus("PAY1", "PAYMENT")).rejects.not.toThrow(/s3cret-password/);
  });
});

async function entrepriseWithProgramme() {
  const entreprise = await createTestUser("entreprise");
  const profile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(profile.id);
  return { entreprise, profile, programme };
}

const fund = (programmeId: string, user: { authHeader: string }, body: Record<string, unknown>) =>
  request(app).post(`/api/payments/programmes/${programmeId}/fund`).set("Authorization", user.authHeader).send(body);

const momo = { method: "mobile_money", amount: 50000, currency: "XAF", phoneNumber: "+24177123456", operator: "airtel" };

describe("Funding a programme with mobile money through PVit", () => {
  it("asks PVit for a PAYMENT, stores our reference and PVit's id, and tells the caller to confirm on the phone", async () => {
    const { entreprise, programme } = await entrepriseWithProgramme();
    const calls = mockPvit();

    const res = await fund(programme.id, entreprise, momo);

    expect(res.status).toBe(201);
    expect(res.body.redirectUrl).toBeNull();
    expect(res.body.awaitingPhoneConfirmation).toBe(true);
    const sent = calls.find((c) => c.url.includes("/PAY/rest"))!;
    expect(sent.body).toMatchObject({
      transaction_type: "PAYMENT",
      amount: 50000,
      customer_account_number: "077123456",
      operator_code: "AIRTEL_MONEY",
      merchant_operation_account_code: "ACC_TEST",
      callback_url_code: "CBCODE123456",
      owner_charge: "CUSTOMER",
      service: "RESTFUL",
    });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.payment.id } });
    expect(payment).toMatchObject({ provider: "pvit", status: "pending", providerTxId: "PAY0001" });
    expect(payment.providerRef).toBe(pvitReference("C", payment.id));
    expect((sent.body as { reference: string }).reference).toBe(payment.providerRef);
  });

  it("validates before touching PVit: phone and operator required, XAF only, configured", async () => {
    const { entreprise, programme } = await entrepriseWithProgramme();
    const calls = mockPvit();

    expect((await fund(programme.id, entreprise, { ...momo, phoneNumber: undefined })).status).toBe(400);
    expect((await fund(programme.id, entreprise, { ...momo, operator: undefined })).status).toBe(400);
    expect((await fund(programme.id, entreprise, { ...momo, currency: "USD" })).status).toBe(400);
    mutableEnv.PVIT_PAYMENT_URL = "";
    expect((await fund(programme.id, entreprise, momo)).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("marks the payment failed when PVit refuses the request outright", async () => {
    const { entreprise, programme } = await entrepriseWithProgramme();
    mockPvit({ payment: () => ({ ok: false, status: 400, body: { error: "Bad Request" } }) });

    const res = await fund(programme.id, entreprise, momo);

    expect(res.status).toBe(500);
    const payment = await prisma.payment.findFirstOrThrow({ where: { programmeId: programme.id } });
    expect(payment.status).toBe("failed");
  });

  it("leaves the payment pending when the outcome is unknown (timeout), so a late callback can still credit it", async () => {
    const { entreprise, programme } = await entrepriseWithProgramme();
    mockPvit({ payment: () => "throw" });

    const res = await fund(programme.id, entreprise, momo);

    expect(res.status).toBe(500);
    const payment = await prisma.payment.findFirstOrThrow({ where: { programmeId: programme.id } });
    expect(payment.status).toBe("pending");
    expect(payment.providerRef).toBe(pvitReference("C", payment.id)); // so the callback can find it
    expect(payment.providerTxId).toBeNull();
  });
});

describe("POST /api/webhooks/pvit — collections", () => {
  async function pendingPayment(amount = 50000) {
    const { entreprise, programme } = await entrepriseWithProgramme();
    mockPvit();
    const res = await fund(programme.id, entreprise, { ...momo, amount });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.payment.id } });
    return { payment };
  }

  const callback = (payment: { providerRef: string }, extra: Record<string, unknown> = {}) =>
    request(app).post("/api/webhooks/pvit").send({
      transactionId: "PAY0001",
      merchantReferenceId: payment.providerRef,
      status: "SUCCESS",
      code: 200,
      transactionOperation: "PAYMENT",
      amount: 50000,
      ...extra,
    });

  const statusSays = (body: Record<string, unknown>) => mockPvit({ status: () => ({ body }) });

  it("credits the payment when PVit's status API confirms it, and acknowledges with a dynamic echo", async () => {
    const { payment } = await pendingPayment();
    statusSays({ status: "SUCCESS", amount: 50000, merchant_reference_id: payment.providerRef, merchant_operation_account_code: "ACC_TEST" });

    const res = await callback(payment, { code: 201 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ transactionId: "PAY0001", responseCode: 201 });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("succeeded");
  });

  it("does not believe the callback body: PVit's own answer wins", async () => {
    const { payment } = await pendingPayment();
    statusSays({ status: "FAILED", merchant_reference_id: payment.providerRef });

    await callback(payment, { status: "SUCCESS" });

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("failed");
  });

  it("does not credit a payment whose confirmed amount differs from what was requested", async () => {
    const { payment } = await pendingPayment(50000);
    statusSays({ status: "SUCCESS", amount: 100, merchant_reference_id: payment.providerRef });

    await callback(payment);

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("ignores a transaction that belongs to a different merchant reference", async () => {
    const { payment } = await pendingPayment();
    statusSays({ status: "SUCCESS", amount: 50000, merchant_reference_id: "SOMEONEELSE123" });

    await callback(payment);

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("stays pending while PVit says PENDING/AMBIGUOUS, and never touches an already settled payment", async () => {
    const { payment } = await pendingPayment();
    statusSays({ status: "AMBIGUOUS", merchant_reference_id: payment.providerRef });
    await callback(payment);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");

    await prisma.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
    statusSays({ status: "FAILED", merchant_reference_id: payment.providerRef });
    await callback(payment);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("succeeded");
  });

  it("settles a payment whose initial request timed out, using the transaction id from the callback", async () => {
    const { entreprise, programme } = await entrepriseWithProgramme();
    mockPvit({ payment: () => "throw" });
    await fund(programme.id, entreprise, momo);
    const payment = await prisma.payment.findFirstOrThrow({ where: { programmeId: programme.id } });
    statusSays({ status: "SUCCESS", amount: 50000, merchant_reference_id: payment.providerRef });

    await callback(payment, { transactionId: "PAYLATE9" });

    const settled = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(settled.status).toBe("succeeded");
    expect(settled.providerTxId).toBe("PAYLATE9");
  });

  it("acknowledges an unknown reference without doing anything, rejects a malformed call, and answers 200 even if PVit can't be reached", async () => {
    mockPvit();
    expect((await callback({ providerRef: "UNKNOWNREF" })).status).toBe(200);
    expect((await request(app).post("/api/webhooks/pvit").send({})).status).toBe(400);

    const { payment } = await pendingPayment();
    mockPvit({ status: () => "throw" });
    expect((await callback(payment)).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("can be restricted to PVit's source IPs", async () => {
    const { payment } = await pendingPayment();
    mutableEnv.PVIT_CALLBACK_IP_ALLOWLIST = "176.31.65.18, 13.59.249.167";
    expect((await callback(payment)).status).toBe(403);
  });
});

async function acceptedReport({ reward = 300000, provider = "airtel", phone = "+24177123456", funded = true } = {}) {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  if (funded) {
    await prisma.payment.create({
      data: { programmeId: programme.id, entrepriseId: entrepriseProfile.id, provider: "pvit", amount: 100_000_000, currency: "XAF", status: "succeeded", providerRef: `f${programme.id.slice(0, 8)}` },
    });
  }
  const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });
  await prisma.hackerPaymentConfig.create({
    data: { hackerId: hackerProfile.id, gainsEnabled: true, paymentMethods: ["mobile_money"], mobileMoneyProvider: provider as "airtel", phoneNumber: phone },
  });
  const report = await prisma.report.create({
    data: {
      title: "SQLi", description: "d", severity: "critique", status: "accepte", hackerId: hackerProfile.id, programmeId: programme.id,
      entrepriseId: entrepriseProfile.id, reward, vulnerability: "SQLi", proof: "p",
    },
  });
  return { report, hackerProfile };
}

const pay = (reportId: string, user: { authHeader: string }) =>
  request(app).post(`/api/payouts/reports/${reportId}`).set("Authorization", user.authHeader);

const giveChangeOk = (body: Record<string, string | number>) => ({
  body: { status: "SUCCESS", status_code: "200", reference_id: "GC0001", merchant_reference_id: body.reference },
});

describe("Paying a hacker through PVit (GIVE_CHANGE)", () => {
  it("sends a GIVE_CHANGE to the hacker's wallet, bearing the fees, and is final immediately", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport({ provider: "moov" });
    const calls = mockPvit({ payment: giveChangeOk });

    const res = await pay(report.id, finance);

    expect(res.status).toBe(201);
    expect(res.body.payout).toMatchObject({ provider: "pvit", status: "succeeded", providerTxId: "GC0001", attempt: 1, currency: "XAF" });
    expect(res.body.payout.providerRef).toBe(pvitReference("P", res.body.payout.id, 1));
    const sent = calls.find((c) => c.url.includes("/PAY/rest"))!;
    expect(sent.body).toMatchObject({
      transaction_type: "GIVE_CHANGE",
      amount: 300000,
      customer_account_number: "077123456",
      operator_code: "MOOV_MONEY",
      owner_charge: "MERCHANT",
      owner_charge_operator: "MERCHANT",
    });
  });

  it("stays pending when PVit answers PENDING, and the sync endpoint settles it from the status API", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: (b) => ({ body: { status: "PENDING", reference_id: "GC0002", merchant_reference_id: b.reference } }) });
    const created = await pay(report.id, finance);
    expect(created.body.payout.status).toBe("pending");

    const calls = mockPvit({ status: () => ({ body: { status: "SUCCESS", merchant_reference_id: created.body.payout.providerRef } }) });
    const synced = await request(app).post(`/api/payouts/${created.body.payout.id}/sync`).set("Authorization", finance.authHeader);

    expect(synced.status).toBe(200);
    expect(synced.body.payout.status).toBe("succeeded");
    expect(String(calls.find((c) => c.url.includes("/STAT/status"))!.url)).toContain("transactionOperation=GIVE_CHANGE");
  });

  it("refuses before creating anything: unsupported operator, invalid number, not configured, insufficient balance", async () => {
    const finance = await createTestUser("finance");
    const calls = mockPvit({ payment: giveChangeOk });

    const mtn = await acceptedReport({ provider: "mtn" });
    expect((await pay(mtn.report.id, finance)).status).toBe(422);
    const badNumber = await acceptedReport({ phone: "+2417123456" });
    expect((await pay(badNumber.report.id, finance)).status).toBe(422);
    expect(await prisma.payout.count({ where: { reportId: { in: [mtn.report.id, badNumber.report.id] } } })).toBe(0);

    const broke = await acceptedReport({ reward: 300000 });
    mockPvit({ payment: giveChangeOk, balance: () => ({ balance: 1000 }) });
    const noMoney = await pay(broke.report.id, finance);
    expect(noMoney.status).toBe(409);
    expect(noMoney.body.error).toContain("Solde du compte PVit insuffisant");
    expect(await prisma.payout.findUnique({ where: { reportId: broke.report.id } })).toBeNull();

    const unconfigured = await acceptedReport();
    mutableEnv.PVIT_PAYMENT_URL = "";
    expect((await pay(unconfigured.report.id, finance)).status).toBe(503);
    expect(calls.filter((c) => c.url.includes("/PAY/rest"))).toHaveLength(0);
  });

  it("an explicit refusal fails the attempt, and the retry uses a new reference", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: () => ({ ok: false, status: 400, body: { error: "Bad Request" } }) });
    expect((await pay(report.id, finance)).status).toBe(500);
    const failed = await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } });
    expect(failed.status).toBe("failed");

    const calls = mockPvit({ payment: giveChangeOk });
    const retry = await pay(report.id, finance);
    expect(retry.status).toBe(201);
    expect(retry.body.payout).toMatchObject({ id: failed.id, attempt: 2, status: "succeeded" });
    expect((calls.find((c) => c.url.includes("/PAY/rest"))!.body as { reference: string }).reference).toBe(pvitReference("P", failed.id, 2));
  });

  it("a FAILED answer from PVit fails the attempt too", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: (b) => ({ body: { status: "FAILED", merchant_reference_id: b.reference } }) });
    expect((await pay(report.id, finance)).status).toBe(500);
    expect((await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } })).status).toBe("failed");
  });

  it("an unknown outcome (timeout) stays pending and can NOT be retried — that would pay twice", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: () => "throw" });

    const res = await pay(report.id, finance);

    expect(res.status).toBe(202);
    expect(res.body.warning).toContain("incertaine");
    const payout = await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } });
    expect(payout).toMatchObject({ status: "pending", providerTxId: null });
    expect(payout.providerRef).toBe(pvitReference("P", payout.id, 1));

    const calls = mockPvit({ payment: giveChangeOk });
    expect((await pay(report.id, finance)).status).toBe(409);
    expect(calls.filter((c) => c.url.includes("/PAY/rest"))).toHaveLength(0);
  });

  it("a human settles that case after checking PVit's dashboard — with a justification, and only for that case", async () => {
    const finance = await createTestUser("finance");
    const hacker = await createTestUser("hacker");
    const { report } = await acceptedReport();
    mockPvit({ payment: () => "throw" });
    await pay(report.id, finance);
    const payout = await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } });

    const resolve = (user: { authHeader: string }, body: Record<string, unknown>) =>
      request(app).post(`/api/payouts/${payout.id}/resolve`).set("Authorization", user.authHeader).send(body);

    expect((await resolve(hacker, { outcome: "failed", note: "Rien dans PVit" })).status).toBe(403);
    expect((await resolve(finance, { outcome: "failed", note: "no" })).status).toBe(400);
    expect((await resolve(finance, { outcome: "failed", note: "Aucune trace dans le tableau de bord PVit" })).status).toBe(200);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } })).status).toBe("failed");
    expect((await resolve(finance, { outcome: "succeeded", note: "Déjà tranché une fois" })).status).toBe(409);

    mockPvit({ payment: giveChangeOk });
    expect((await pay(report.id, finance)).status).toBe(201); // the retry is now allowed
  });

  it("refuses to resolve by hand a payout PVit can be asked about", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: (b) => ({ body: { status: "PENDING", reference_id: "GC0009", merchant_reference_id: b.reference } }) });
    const created = await pay(report.id, finance);
    const res = await request(app).post(`/api/payouts/${created.body.payout.id}/resolve`).set("Authorization", finance.authHeader).send({ outcome: "failed", note: "Je force quand même" });
    expect(res.status).toBe(409);
  });

  it("adopts a previous failed attempt that PVit actually executed, instead of paying again", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: giveChangeOk });
    const first = await pay(report.id, finance);
    await prisma.payout.update({ where: { id: first.body.payout.id }, data: { status: "failed" } }); // recorded as failed by mistake

    const calls = mockPvit({ status: () => ({ body: { status: "SUCCESS", merchant_reference_id: first.body.payout.providerRef } }) });
    const retry = await pay(report.id, finance);

    expect(retry.status).toBe(200);
    expect(retry.body.adopted).toBe(true);
    expect(retry.body.payout.status).toBe("succeeded");
    expect(calls.some((c) => c.url.includes("/PAY/rest"))).toBe(false);
  });
});

describe("POST /api/webhooks/pvit — payouts, and reconciliation", () => {
  it("settles a pending payout from a GIVE_CHANGE callback, verified against the status API", async () => {
    const finance = await createTestUser("finance");
    const { report } = await acceptedReport();
    mockPvit({ payment: (b) => ({ body: { status: "PENDING", reference_id: "GC0010", merchant_reference_id: b.reference } }) });
    const created = await pay(report.id, finance);

    mockPvit({ status: () => ({ body: { status: "FAILED", merchant_reference_id: created.body.payout.providerRef } }) });
    const res = await request(app).post("/api/webhooks/pvit").send({
      transactionId: "GC0010", merchantReferenceId: created.body.payout.providerRef, status: "SUCCESS", code: 200, transactionOperation: "GIVE_CHANGE",
    });

    expect(res.status).toBe(200);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: created.body.payout.id } })).status).toBe("failed");
  });

  it("the reconciliation job settles old pending PVit transactions and skips fresh ones", async () => {
    const finance = await createTestUser("finance");
    const old = await acceptedReport();
    const fresh = await acceptedReport();
    const pendingBody = (b: Record<string, string | number>) => ({ body: { status: "PENDING", reference_id: `GC${String(b.reference).slice(-6)}`, merchant_reference_id: b.reference } });
    mockPvit({ payment: pendingBody });
    const oldPayout = (await pay(old.report.id, finance)).body.payout.id as string;
    const freshPayout = (await pay(fresh.report.id, finance)).body.payout.id as string;
    await prisma.$executeRaw`UPDATE payouts SET "updatedAt" = now() - interval '10 minutes' WHERE id = ${oldPayout}::uuid`;

    mockPvit({ status: () => ({ body: { status: "SUCCESS" } }) });
    await reconcilePendingPvit();

    expect((await prisma.payout.findUniqueOrThrow({ where: { id: oldPayout } })).status).toBe("succeeded");
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: freshPayout } })).status).toBe("pending");
  });
});
