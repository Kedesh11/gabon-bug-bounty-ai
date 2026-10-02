import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { stripeMocks, cinetpayFetchMock, jsonResponse } from "./setup.js";
import { prisma } from "../src/prisma.js";

beforeEach(() => {
  stripeMocks.transfersCreate.mockReset();
  stripeMocks.accountsRetrieve.mockReset();
  cinetpayFetchMock.mockReset();
});

async function fundProgramme(programmeId: string, entrepriseId: string, amount: number, currency = "XAF") {
  await prisma.payment.create({
    data: { programmeId, entrepriseId, provider: "stripe", amount, currency, status: "succeeded", providerRef: `cs_test_${programmeId}_${currency}` },
  });
}

// Programmes are funded by default (a generous XAF balance) — payouts are now refused on an
// unfunded programme, which the dedicated tests below exercise with `funded: false`.
async function createAcceptedReport(reward = 500000, { funded = true } = {}) {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  if (funded) await fundProgramme(programme.id, entrepriseProfile.id, 100_000_000);
  const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });

  const report = await prisma.report.create({
    data: {
      title: "XSS",
      description: "desc",
      severity: "haute",
      status: "accepte",
      hackerId: hackerProfile.id,
      programmeId: programme.id,
      entrepriseId: entrepriseProfile.id,
      reward,
      vulnerability: "XSS",
      proof: "poc",
    },
  });

  return { hacker, hackerProfile, entreprise, entrepriseProfile, report };
}

describe("POST /api/payouts/reports/:id", () => {
  it("rejects a hacker triggering a payout", async () => {
    const { hacker, report } = await createAcceptedReport();
    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("rejects a payout on a report that isn't accepted", async () => {
    const admin = await createTestUser("admin");
    const { hackerProfile, entreprise } = await createAcceptedReport();
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const pendingReport = await prisma.report.create({
      data: {
        title: "SQLi",
        description: "desc",
        severity: "critique",
        status: "en_analyse",
        hackerId: hackerProfile.id,
        programmeId: programme.id,
        entrepriseId: entrepriseProfile.id,
        reward: 0,
        vulnerability: "SQLi",
        proof: "poc",
      },
    });

    const res = await request(app)
      .post(`/api/payouts/reports/${pendingReport.id}`)
      .set("Authorization", admin.authHeader);
    expect(res.status).toBe(400);
  });

  it("errors clearly, without creating a payout row, when the hacker has no payment method", async () => {
    const admin = await createTestUser("admin");
    const { report } = await createAcceptedReport();

    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", admin.authHeader);

    expect(res.status).toBe(422);
    expect(await prisma.payout.findUnique({ where: { reportId: report.id } })).toBeNull();
  });

  it("does not pick Stripe for an account that hasn't finished onboarding", async () => {
    const admin = await createTestUser("admin");
    const { hackerProfile, report } = await createAcceptedReport();
    await prisma.hackerProfile.update({ where: { id: hackerProfile.id }, data: { stripeAccountId: "acct_pending" } });
    stripeMocks.accountsRetrieve.mockResolvedValue({
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "pending" } } } } },
    });

    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", admin.authHeader);

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("onboarding");
    expect(stripeMocks.transfersCreate).not.toHaveBeenCalled();
    expect(await prisma.payout.findUnique({ where: { reportId: report.id } })).toBeNull();
  });

  it("lets a failed payout be retried on the same row, and reuses the Stripe idempotency key", async () => {
    const finance = await createTestUser("finance");
    const { hackerProfile, report } = await createAcceptedReport(200000);
    await prisma.hackerProfile.update({ where: { id: hackerProfile.id }, data: { stripeAccountId: "acct_retry" } });
    stripeMocks.accountsRetrieve.mockResolvedValue({
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } },
    });
    stripeMocks.transfersCreate.mockRejectedValueOnce(new Error("Stripe indisponible"));

    const first = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);
    expect(first.status).toBe(500);
    const failed = await prisma.payout.findUniqueOrThrow({ where: { reportId: report.id } });
    expect(failed.status).toBe("failed");

    stripeMocks.transfersCreate.mockResolvedValueOnce({ id: "tr_retry" });
    const second = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);
    expect(second.status).toBe(201);
    expect(second.body.payout.id).toBe(failed.id);
    expect(second.body.payout.status).toBe("succeeded");
    const keys = stripeMocks.transfersCreate.mock.calls.map((c) => c[1]?.idempotencyKey);
    expect(keys).toEqual([`payout-${failed.id}`, `payout-${failed.id}`]);
  });

  it("pays out via Stripe transfer when the hacker has an onboarded Connect account", async () => {
    const finance = await createTestUser("finance");
    const { hackerProfile, report } = await createAcceptedReport(750000);
    await prisma.hackerProfile.update({ where: { id: hackerProfile.id }, data: { stripeAccountId: "acct_test_123" } });

    stripeMocks.accountsRetrieve.mockResolvedValue({
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } },
    });
    stripeMocks.transfersCreate.mockResolvedValue({ id: "tr_test_123" });

    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);

    expect(res.status).toBe(201);
    expect(res.body.payout.status).toBe("succeeded");
    expect(res.body.payout.provider).toBe("stripe");
    expect(res.body.payout.providerRef).toBe("tr_test_123");
  });

  it("pays a USD reward in USD via Stripe, and refuses to settle it through XAF-only mobile money", async () => {
    const admin = await createTestUser("admin");
    const stripeCase = await createAcceptedReport(500);
    await prisma.programme.update({ where: { id: stripeCase.report.programmeId }, data: { rewardCurrency: "USD" } });
    await fundProgramme(stripeCase.report.programmeId, stripeCase.entrepriseProfile.id, 100_000, "USD");
    await prisma.hackerProfile.update({ where: { id: stripeCase.hackerProfile.id }, data: { stripeAccountId: "acct_usd" } });
    stripeMocks.accountsRetrieve.mockResolvedValue({
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } },
    });
    stripeMocks.transfersCreate.mockResolvedValue({ id: "tr_usd" });

    const ok = await request(app).post(`/api/payouts/reports/${stripeCase.report.id}`).set("Authorization", admin.authHeader);
    expect(ok.status).toBe(201);
    expect(ok.body.payout.currency).toBe("USD");
    expect(stripeMocks.transfersCreate.mock.calls[0][0]).toMatchObject({ amount: 50000, currency: "usd" });

    const momoCase = await createAcceptedReport(500);
    await prisma.programme.update({ where: { id: momoCase.report.programmeId }, data: { rewardCurrency: "EUR" } });
    await fundProgramme(momoCase.report.programmeId, momoCase.entrepriseProfile.id, 100_000, "EUR");
    await prisma.hackerPaymentConfig.create({
      data: { hackerId: momoCase.hackerProfile.id, gainsEnabled: true, paymentMethods: ["mobile_money"], mobileMoneyProvider: "airtel", phoneNumber: "+24177123456" },
    });
    const refused = await request(app).post(`/api/payouts/reports/${momoCase.report.id}`).set("Authorization", admin.authHeader);
    expect(refused.status).toBe(422);
    expect(await prisma.payout.findUnique({ where: { reportId: momoCase.report.id } })).toBeNull();
  });

  describe("funding check", () => {
    const stripeReady = async (hackerProfileId: string, account: string) => {
      await prisma.hackerProfile.update({ where: { id: hackerProfileId }, data: { stripeAccountId: account } });
      stripeMocks.accountsRetrieve.mockResolvedValue({
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } },
      });
      stripeMocks.transfersCreate.mockResolvedValue({ id: `tr_${account}` });
    };

    it("refuses a payout on a programme that has not been funded, without creating a payout row", async () => {
      const finance = await createTestUser("finance");
      const { hackerProfile, report } = await createAcceptedReport(300000, { funded: false });
      await stripeReady(hackerProfile.id, "acct_unfunded");

      const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("insuffisamment financé");
      expect(stripeMocks.transfersCreate).not.toHaveBeenCalled();
      expect(await prisma.payout.findUnique({ where: { reportId: report.id } })).toBeNull();
    });

    it("ignores pending/failed payments and funding in another currency", async () => {
      const finance = await createTestUser("finance");
      const { hackerProfile, entrepriseProfile, report } = await createAcceptedReport(300000, { funded: false });
      await stripeReady(hackerProfile.id, "acct_noise");
      await prisma.payment.createMany({
        data: [
          { programmeId: report.programmeId, entrepriseId: entrepriseProfile.id, provider: "stripe", amount: 900000, currency: "XAF", status: "pending", providerRef: "a" },
          { programmeId: report.programmeId, entrepriseId: entrepriseProfile.id, provider: "stripe", amount: 900000, currency: "XAF", status: "failed", providerRef: "b" },
          { programmeId: report.programmeId, entrepriseId: entrepriseProfile.id, provider: "stripe", amount: 900000, currency: "USD", status: "succeeded", providerRef: "c" },
        ],
      });

      const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);
      expect(res.status).toBe(409);
    });

    it("counts rewards already paid, so a programme cannot be overspent", async () => {
      const finance = await createTestUser("finance");
      const first = await createAcceptedReport(300000, { funded: false });
      await fundProgramme(first.report.programmeId, first.entrepriseProfile.id, 400000);
      await stripeReady(first.hackerProfile.id, "acct_first");

      const second = await createAcceptedReport(300000, { funded: false });
      // Same programme for both reports: move the second report onto the first one's programme.
      await prisma.report.update({ where: { id: second.report.id }, data: { programmeId: first.report.programmeId, entrepriseId: first.entrepriseProfile.id } });
      await stripeReady(second.hackerProfile.id, "acct_second");

      const ok = await request(app).post(`/api/payouts/reports/${first.report.id}`).set("Authorization", finance.authHeader);
      expect(ok.status).toBe(201);
      const refused = await request(app).post(`/api/payouts/reports/${second.report.id}`).set("Authorization", finance.authHeader);
      expect(refused.status).toBe(409);
      expect(refused.body.error).toContain("100000 XAF disponibles");
    });

    it("lets only one of two simultaneous payouts through when the balance covers just one", async () => {
      const finance = await createTestUser("finance");
      const first = await createAcceptedReport(300000, { funded: false });
      await fundProgramme(first.report.programmeId, first.entrepriseProfile.id, 400000);
      await stripeReady(first.hackerProfile.id, "acct_race_1");
      const second = await createAcceptedReport(300000, { funded: false });
      await prisma.report.update({ where: { id: second.report.id }, data: { programmeId: first.report.programmeId, entrepriseId: first.entrepriseProfile.id } });
      await stripeReady(second.hackerProfile.id, "acct_race_2");

      const results = await Promise.all([
        request(app).post(`/api/payouts/reports/${first.report.id}`).set("Authorization", finance.authHeader),
        request(app).post(`/api/payouts/reports/${second.report.id}`).set("Authorization", finance.authHeader),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  it("pays out via CinetPay when the hacker only has mobile money configured", async () => {
    const admin = await createTestUser("admin");
    const { hackerProfile, report } = await createAcceptedReport(300000);
    await prisma.hackerPaymentConfig.create({
      data: {
        hackerId: hackerProfile.id,
        gainsEnabled: true,
        paymentMethods: ["mobile_money"],
        mobileMoneyProvider: "airtel",
        phoneNumber: "+24177123456",
      },
    });

    cinetpayFetchMock
      // POST /v1/auth/login
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "OPERATION_SUCCES", data: { token: "tok_transfer" } }))
      // POST /v1/transfer/contact
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "OPERATION_SUCCES" }))
      // POST /v1/auth/login (send-money call fetches its own token)
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "OPERATION_SUCCES", data: { token: "tok_transfer" } }))
      // POST /v1/transfer/money/send/contact
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "OPERATION_SUCCES" }));

    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", admin.authHeader);

    expect(res.status).toBe(201);
    expect(res.body.payout.status).toBe("succeeded");
    expect(res.body.payout.provider).toBe("cinetpay");
  });

  it("rejects a second payout for the same report", async () => {
    const finance = await createTestUser("finance");
    const { hackerProfile, report } = await createAcceptedReport(100000);
    await prisma.hackerProfile.update({ where: { id: hackerProfile.id }, data: { stripeAccountId: "acct_test_456" } });
    stripeMocks.accountsRetrieve.mockResolvedValue({
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } },
    });
    stripeMocks.transfersCreate.mockResolvedValue({ id: "tr_test_456" });

    const first = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", finance.authHeader);
    expect(second.status).toBe(409);
  });
});

describe("GET /api/payouts — finance transaction ledger", () => {
  it("rejects a caller without dashboard.finance.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/payouts").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("lets finance list real payouts with report/programme names attached", async () => {
    const finance = await createTestUser("finance");
    const { hackerProfile, report } = await createAcceptedReport(150000);
    await prisma.payout.create({
      data: { reportId: report.id, hackerId: hackerProfile.id, provider: "cinetpay", status: "succeeded", amount: 150000, currency: "XAF", providerRef: "tr_test" },
    });

    const res = await request(app).get("/api/payouts").set("Authorization", finance.authHeader);
    expect(res.status).toBe(200);
    const match = res.body.payouts.find((p: { reportId: string }) => p.reportId === report.id);
    expect(match).toBeTruthy();
    expect(match.report.programme.name).toBeTruthy();
  });
});
