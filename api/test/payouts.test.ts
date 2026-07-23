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

async function createAcceptedReport(reward = 500000) {
  const hacker = await createTestUser("hacker");
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
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

  return { hacker, hackerProfile, entreprise, report };
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

  it("errors clearly when the hacker has no payment method configured", async () => {
    const admin = await createTestUser("admin");
    const { report } = await createAcceptedReport();

    const res = await request(app).post(`/api/payouts/reports/${report.id}`).set("Authorization", admin.authHeader);

    expect(res.status).toBe(500);
    const payout = await prisma.payout.findUnique({ where: { reportId: report.id } });
    expect(payout?.status).toBe("failed");
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
