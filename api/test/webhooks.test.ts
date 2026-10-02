import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { stripeMocks } from "./setup.js";
import { prisma } from "../src/prisma.js";

beforeEach(() => {
  stripeMocks.webhooksConstructEvent.mockReset();
});

async function createPendingPayment(amount = 500000, currency = "XAF") {
  const entreprise = await createTestUser("entreprise");
  const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
  const programme = await createTestProgramme(entrepriseProfile.id);
  const sessionId = `cs_test_${programme.id}`;
  const payment = await prisma.payment.create({
    data: { programmeId: programme.id, entrepriseId: entrepriseProfile.id, provider: "stripe", amount, currency, providerRef: sessionId },
  });
  return { payment, sessionId };
}

function sendStripeEvent(type: string, session: Record<string, unknown>) {
  stripeMocks.webhooksConstructEvent.mockReturnValue({ type, data: { object: session } });
  return request(app)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", "t=1,v1=fake")
    .set("Content-Type", "application/json")
    .send("{}");
}

describe("POST /api/webhooks/stripe", () => {
  it("rejects a request without a valid signature", async () => {
    stripeMocks.webhooksConstructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await request(app).post("/api/webhooks/stripe").set("stripe-signature", "bad").set("Content-Type", "application/json").send("{}");
    expect(res.status).toBe(400);
  });

  it("marks the payment succeeded when a paid session matches the recorded amount", async () => {
    const { payment, sessionId } = await createPendingPayment(500000, "XAF");
    const res = await sendStripeEvent("checkout.session.completed", {
      id: sessionId,
      client_reference_id: payment.id,
      payment_status: "paid",
      amount_total: 500000,
      currency: "xaf",
    });
    expect(res.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("succeeded");
  });

  it("converts non-zero-decimal currencies to minor units before comparing", async () => {
    const { payment, sessionId } = await createPendingPayment(1000, "USD");
    await sendStripeEvent("checkout.session.completed", {
      id: sessionId,
      client_reference_id: payment.id,
      payment_status: "paid",
      amount_total: 100000,
      currency: "usd",
    });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("succeeded");
  });

  it("does not mark the payment received when the Stripe amount differs", async () => {
    const { payment, sessionId } = await createPendingPayment(500000, "XAF");
    await sendStripeEvent("checkout.session.completed", {
      id: sessionId,
      client_reference_id: payment.id,
      payment_status: "paid",
      amount_total: 50,
      currency: "xaf",
    });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("does not mark an unpaid (async, still processing) session as succeeded", async () => {
    const { payment, sessionId } = await createPendingPayment();
    await sendStripeEvent("checkout.session.completed", {
      id: sessionId,
      client_reference_id: payment.id,
      payment_status: "unpaid",
      amount_total: 500000,
      currency: "xaf",
    });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });

  it("marks an expired session's payment failed, and never downgrades a succeeded one", async () => {
    const abandoned = await createPendingPayment();
    await sendStripeEvent("checkout.session.expired", { id: abandoned.sessionId, client_reference_id: abandoned.payment.id });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: abandoned.payment.id } })).status).toBe("failed");

    const settled = await createPendingPayment();
    await prisma.payment.update({ where: { id: settled.payment.id }, data: { status: "succeeded" } });
    await sendStripeEvent("checkout.session.expired", { id: settled.sessionId, client_reference_id: settled.payment.id });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: settled.payment.id } })).status).toBe("succeeded");
  });
});
