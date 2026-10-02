import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { cinetpayFetchMock, jsonResponse } from "./setup.js";
import { prisma } from "../src/prisma.js";
import { reconcilePendingCinetpayPayouts } from "../src/services/payments/cinetpay/payoutSync.js";

interface Handlers {
  send?: () => unknown;
  check?: (clientTransactionId: string) => unknown;
  paymentCheck?: () => unknown;
}

// Routes every outgoing CinetPay call by URL so tests don't depend on call order.
function mockCinetpay(handlers: Handlers) {
  const sent: { url: string; body: URLSearchParams | undefined }[] = [];
  cinetpayFetchMock.mockImplementation(async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input);
    sent.push({ url, body: init?.body instanceof URLSearchParams ? init.body : undefined });
    if (url.includes("/auth/login")) return jsonResponse({ code: 0, message: "OPERATION_SUCCES", data: { token: "tok" } });
    if (url.includes("/transfer/contact")) return jsonResponse({ code: 0, message: "OPERATION_SUCCES" });
    if (url.includes("/transfer/money/send/contact")) return jsonResponse(handlers.send?.() ?? { code: 0, message: "OPERATION_SUCCES", data: { transaction_id: "EA1.2.Z3", treatment_status: "NEW" } });
    if (url.includes("/transfer/check/money")) {
      const id = new URL(url).searchParams.get("client_transaction_id") as string;
      return jsonResponse(handlers.check?.(id) ?? { code: 0, message: "OPERATION_SUCCES", data: [{ treatment_status: "NEW" }] });
    }
    if (url.includes("/payment/check")) return jsonResponse(handlers.paymentCheck?.() ?? { code: "00", message: "SUCCES", data: { status: "PENDING" } });
    throw new Error(`unexpected CinetPay call: ${url}`);
  });
  return sent;
}

beforeEach(() => {
  cinetpayFetchMock.mockReset();
});

const treatment = (status: string) => ({ code: 0, message: "OPERATION_SUCCES", data: [{ treatment_status: status }] });

async function createMobileMoneyReport(reward = 300000) {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  await prisma.payment.create({
    data: { programmeId: programme.id, entrepriseId: entrepriseProfile.id, provider: "stripe", amount: 100_000_000, currency: "XAF", status: "succeeded", providerRef: `cs_${programme.id}` },
  });
  const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });
  await prisma.hackerPaymentConfig.create({
    data: { hackerId: hackerProfile.id, gainsEnabled: true, paymentMethods: ["mobile_money"], mobileMoneyProvider: "airtel", phoneNumber: "+24177123456" },
  });
  const report = await prisma.report.create({
    data: {
      title: "RCE", description: "d", severity: "critique", status: "accepte", hackerId: hackerProfile.id, programmeId: programme.id,
      entrepriseId: entrepriseProfile.id, reward, vulnerability: "RCE", proof: "p",
    },
  });
  return { report, hackerProfile };
}

const pay = (reportId: string, user: { authHeader: string }) =>
  request(app).post(`/api/payouts/reports/${reportId}`).set("Authorization", user.authHeader);

describe("CinetPay mobile-money payout is asynchronous", () => {
  it("records the transfer as pending with CinetPay's transaction id, and sends a notify_url", async () => {
    const finance = await createTestUser("finance");
    const { report } = await createMobileMoneyReport();
    const sent = mockCinetpay({});

    const res = await pay(report.id, finance);

    expect(res.status).toBe(201);
    expect(res.body.payout).toMatchObject({ status: "pending", provider: "cinetpay", providerRef: "EA1.2.Z3", attempt: 1 });
    const send = sent.find((c) => c.url.includes("/transfer/money/send/contact"))!;
    expect(send.body!.get("client_transaction_id")).toBe(res.body.payout.id);
    expect(send.body!.get("notify_url")).toContain("/api/webhooks/cinetpay-transfer");
  });

  it("refuses an amount that isn't a multiple of 5 before creating anything", async () => {
    const finance = await createTestUser("finance");
    const { report } = await createMobileMoneyReport(300001);
    const sent = mockCinetpay({});

    const res = await pay(report.id, finance);

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("multiple de 5");
    expect(sent).toHaveLength(0);
    expect(await prisma.payout.findUnique({ where: { reportId: report.id } })).toBeNull();
  });

  it("treats an order CinetPay immediately rejects as a failed attempt", async () => {
    const finance = await createTestUser("finance");
    const { report } = await createMobileMoneyReport();
    mockCinetpay({ send: () => ({ code: 0, message: "OPERATION_SUCCES", data: { treatment_status: "REJ" } }) });

    const res = await pay(report.id, finance);

    expect(res.status).toBe(500);
    expect((await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } })).status).toBe("failed");
  });
});

describe("POST /api/webhooks/cinetpay-transfer", () => {
  async function pendingPayout() {
    const finance = await createTestUser("finance");
    const { report } = await createMobileMoneyReport();
    mockCinetpay({});
    const res = await pay(report.id, finance);
    return { payoutId: res.body.payout.id as string, finance };
  }

  const notify = (clientTransactionId: string | undefined) =>
    request(app).post("/api/webhooks/cinetpay-transfer").type("form").send(clientTransactionId ? { client_transaction_id: clientTransactionId, treatment_status: "VAL" } : {});

  it("settles the payout from CinetPay's own answer, not from the notification body", async () => {
    const { payoutId } = await pendingPayout();
    // The body CLAIMS success; CinetPay's check says it was rejected — the check wins.
    mockCinetpay({ check: () => treatment("REJ") });

    expect((await notify(payoutId)).status).toBe(200);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } })).status).toBe("failed");
  });

  it("marks it succeeded when CinetPay confirms VAL, and leaves it pending while NEW/REC", async () => {
    const { payoutId } = await pendingPayout();
    mockCinetpay({ check: () => treatment("REC") });
    await notify(payoutId);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } })).status).toBe("pending");

    mockCinetpay({ check: () => treatment("VAL") });
    await notify(payoutId);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } })).status).toBe("succeeded");
  });

  it("never touches a payout that is already settled, and ignores malformed calls", async () => {
    const { payoutId } = await pendingPayout();
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "succeeded" } });
    mockCinetpay({ check: () => treatment("REJ") });

    await notify(payoutId);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } })).status).toBe("succeeded");

    expect((await notify(undefined)).status).toBe(400);
    expect((await notify("not-a-uuid-at-all")).status).toBe(400);
  });

  it("still answers 200 when CinetPay can't be reached — the reconciliation job will retry", async () => {
    const { payoutId } = await pendingPayout();
    cinetpayFetchMock.mockRejectedValue(new Error("network down"));
    expect((await notify(payoutId)).status).toBe(200);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } })).status).toBe("pending");
  });
});

describe("Reconciliation and manual sync", () => {
  it("the reconciliation job settles old pending payouts and skips fresh ones", async () => {
    const finance = await createTestUser("finance");
    const old = await createMobileMoneyReport();
    const fresh = await createMobileMoneyReport();
    mockCinetpay({});
    const oldPayout = (await pay(old.report.id, finance)).body.payout.id as string;
    const freshPayout = (await pay(fresh.report.id, finance)).body.payout.id as string;
    await prisma.$executeRaw`UPDATE payouts SET "updatedAt" = now() - interval '10 minutes' WHERE id = ${oldPayout}::uuid`;

    mockCinetpay({ check: () => treatment("VAL") });
    await reconcilePendingCinetpayPayouts();

    expect((await prisma.payout.findUniqueOrThrow({ where: { id: oldPayout } })).status).toBe("succeeded");
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: freshPayout } })).status).toBe("pending");
  });

  it("lets finance sync one payout by hand, and refuses Stripe payouts", async () => {
    const finance = await createTestUser("finance");
    const hacker = await createTestUser("hacker");
    const { report } = await createMobileMoneyReport();
    mockCinetpay({});
    const payoutId = (await pay(report.id, finance)).body.payout.id as string;

    mockCinetpay({ check: () => treatment("VAL") });
    const res = await request(app).post(`/api/payouts/${payoutId}/sync`).set("Authorization", finance.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.payout.status).toBe("succeeded");

    expect((await request(app).post(`/api/payouts/${payoutId}/sync`).set("Authorization", hacker.authHeader)).status).toBe(403);

    await prisma.payout.update({ where: { id: payoutId }, data: { provider: "stripe" } });
    expect((await request(app).post(`/api/payouts/${payoutId}/sync`).set("Authorization", finance.authHeader)).status).toBe(400);
  });
});

describe("Retrying a failed CinetPay payout can never pay twice", () => {
  async function failedPayout() {
    const finance = await createTestUser("finance");
    const { report } = await createMobileMoneyReport();
    mockCinetpay({ send: () => ({ code: 1, message: "TIMEOUT" }) });
    expect((await pay(report.id, finance)).status).toBe(500);
    const payout = await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } });
    expect(payout.status).toBe("failed");
    return { finance, report, payout };
  }

  it("adopts the previous attempt when CinetPay actually received (and settled) it", async () => {
    const { finance, report, payout } = await failedPayout();
    const sent = mockCinetpay({ check: () => treatment("VAL") });

    const res = await pay(report.id, finance);

    expect(res.status).toBe(200);
    expect(res.body.adopted).toBe(true);
    expect(res.body.payout.status).toBe("succeeded");
    expect(sent.some((c) => c.url.includes("/transfer/money/send/contact"))).toBe(false);
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } })).attempt).toBe(1);
  });

  it("adopts it as pending when CinetPay is still processing it", async () => {
    const { finance, report } = await failedPayout();
    mockCinetpay({ check: () => treatment("REC") });
    const res = await pay(report.id, finance);
    expect(res.status).toBe(202);
    expect(res.body.payout.status).toBe("pending");
  });

  it("sends a fresh transfer with a NEW client_transaction_id when CinetPay never saw the first", async () => {
    const { finance, report, payout } = await failedPayout();
    const sent = mockCinetpay({ check: () => ({ code: 724, message: "TRANSACTION_NOT_FOUND" }) });

    const res = await pay(report.id, finance);

    expect(res.status).toBe(201);
    expect(res.body.payout.attempt).toBe(2);
    const send = sent.find((c) => c.url.includes("/transfer/money/send/contact"))!;
    expect(send.body!.get("client_transaction_id")).toBe(`${payout.id}-2`);
  });

  it("stops the retry (no new transfer) when CinetPay can't be asked about the previous attempt", async () => {
    const { finance, report } = await failedPayout();
    cinetpayFetchMock.mockRejectedValue(new Error("network down"));
    const res = await pay(report.id, finance);
    expect(res.status).toBe(500);
    expect((await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } })).attempt).toBe(1);
  });
});

describe("CinetPay checkout notification verifies the amount", () => {
  async function pendingCollection(amount = 50000) {
    const entreprise = await createTestUser("entreprise");
    const profile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(profile.id);
    return prisma.payment.create({
      data: { programmeId: programme.id, entrepriseId: profile.id, provider: "cinetpay", amount, currency: "XAF", providerRef: "x" },
    });
  }
  const notifyPayment = (id: string) => request(app).post("/api/webhooks/cinetpay").type("form").send({ cpm_trans_id: id });

  it("marks the payment succeeded when CinetPay confirms the same amount and currency", async () => {
    const payment = await pendingCollection(50000);
    mockCinetpay({ paymentCheck: () => ({ code: "00", message: "SUCCES", data: { status: "ACCEPTED", amount: "50000", currency: "XAF" } }) });
    await notifyPayment(payment.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("succeeded");
  });

  it("does not mark it received when the confirmed amount differs", async () => {
    const payment = await pendingCollection(50000);
    mockCinetpay({ paymentCheck: () => ({ code: "00", message: "SUCCES", data: { status: "ACCEPTED", amount: "100", currency: "XAF" } }) });
    await notifyPayment(payment.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("fails an expired or refused payment, and never downgrades a settled one", async () => {
    const expired = await pendingCollection();
    mockCinetpay({ paymentCheck: () => ({ code: "00", message: "SUCCES", data: { status: "EXPIRED" } }) });
    await notifyPayment(expired.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: expired.id } })).status).toBe("failed");

    const settled = await pendingCollection();
    await prisma.payment.update({ where: { id: settled.id }, data: { status: "succeeded" } });
    mockCinetpay({ paymentCheck: () => ({ code: "00", message: "SUCCES", data: { status: "REFUSED" } }) });
    await notifyPayment(settled.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: settled.id } })).status).toBe("succeeded");
  });
});
