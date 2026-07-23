import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { stripeMocks, cinetpayFetchMock, jsonResponse } from "./setup.js";
import { prisma } from "../src/prisma.js";

beforeEach(() => {
  stripeMocks.checkoutSessionsCreate.mockReset();
  cinetpayFetchMock.mockReset();
});

describe("POST /api/payments/programmes/:id/fund", () => {
  it("rejects a hacker trying to fund a programme", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    const res = await request(app)
      .post(`/api/payments/programmes/${programme.id}/fund`)
      .set("Authorization", hacker.authHeader)
      .send({ method: "card", amount: 500000, currency: "XAF" });

    expect(res.status).toBe(403);
  });

  it("rejects an entreprise funding another entreprise's programme", async () => {
    const owner = await createTestUser("entreprise");
    const intruder = await createTestUser("entreprise");
    const ownerProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: owner.id } });
    const programme = await createTestProgramme(ownerProfile.id);

    const res = await request(app)
      .post(`/api/payments/programmes/${programme.id}/fund`)
      .set("Authorization", intruder.authHeader)
      .send({ method: "card", amount: 500000, currency: "XAF" });

    expect(res.status).toBe(403);
  });

  it("creates a Stripe Checkout Session for a card payment and records a pending Payment", async () => {
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    stripeMocks.checkoutSessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const res = await request(app)
      .post(`/api/payments/programmes/${programme.id}/fund`)
      .set("Authorization", entreprise.authHeader)
      .send({ method: "card", amount: 500000, currency: "XAF" });

    expect(res.status).toBe(201);
    expect(res.body.redirectUrl).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(stripeMocks.checkoutSessionsCreate).toHaveBeenCalledTimes(1);

    const payment = await prisma.payment.findUnique({ where: { id: res.body.payment.id } });
    expect(payment?.provider).toBe("stripe");
    expect(payment?.providerRef).toBe("cs_test_123");
  });

  it("creates a CinetPay payment link for a mobile money payment", async () => {
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    cinetpayFetchMock.mockResolvedValue(
      jsonResponse({
        code: "201",
        message: "CREATED",
        data: { payment_token: "tok_abc", payment_url: "https://checkout.cinetpay.com/payment/abc" },
      }),
    );

    const res = await request(app)
      .post(`/api/payments/programmes/${programme.id}/fund`)
      .set("Authorization", entreprise.authHeader)
      .send({ method: "mobile_money", amount: 250000, currency: "XAF" });

    expect(res.status).toBe(201);
    expect(res.body.redirectUrl).toBe("https://checkout.cinetpay.com/payment/abc");

    const payment = await prisma.payment.findUnique({ where: { id: res.body.payment.id } });
    expect(payment?.provider).toBe("cinetpay");
  });

  it("marks the Payment failed if the provider call throws", async () => {
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);

    stripeMocks.checkoutSessionsCreate.mockRejectedValue(new Error("stripe is down"));

    const res = await request(app)
      .post(`/api/payments/programmes/${programme.id}/fund`)
      .set("Authorization", entreprise.authHeader)
      .send({ method: "card", amount: 500000, currency: "XAF" });

    expect(res.status).toBe(500);
    const payments = await prisma.payment.findMany({ where: { programmeId: programme.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("failed");
  });
});

describe("GET /api/payments — finance transaction ledger", () => {
  it("rejects a caller without dashboard.finance.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/payments").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("lets finance list real payments with programme/entreprise names attached", async () => {
    const finance = await createTestUser("finance");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    await prisma.payment.create({
      data: { programmeId: programme.id, entrepriseId: entrepriseProfile.id, provider: "stripe", status: "succeeded", amount: 300000, currency: "XAF", providerRef: "cs_test" },
    });

    const res = await request(app).get("/api/payments").set("Authorization", finance.authHeader);
    expect(res.status).toBe(200);
    const match = res.body.payments.find((p: { programmeId: string }) => p.programmeId === programme.id);
    expect(match).toBeTruthy();
    expect(match.programme.name).toBe(programme.name);
  });
});
