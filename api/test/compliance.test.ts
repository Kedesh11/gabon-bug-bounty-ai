import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("Compliance checklist permission gate", () => {
  it("rejects a caller without compliance.manage from every route", async () => {
    const hacker = await createTestUser("hacker");

    const listRes = await request(app).get("/api/compliance/items").set("Authorization", hacker.authHeader);
    expect(listRes.status).toBe(403);

    const createRes = await request(app).post("/api/compliance/items").set("Authorization", hacker.authHeader).send({ label: "X" });
    expect(createRes.status).toBe(403);
  });

  it("allows finance (has compliance.manage by default)", async () => {
    const finance = await createTestUser("finance");
    const res = await request(app).get("/api/compliance/items").set("Authorization", finance.authHeader);
    expect(res.status).toBe(200);
  });
});

describe("Compliance items CRUD", () => {
  it("creates, lists, toggles done, then deletes an item", async () => {
    const finance = await createTestUser("finance");

    const createRes = await request(app)
      .post("/api/compliance/items")
      .set("Authorization", finance.authHeader)
      .send({ label: "Vérification KYC du mois" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.item.isDone).toBe(false);
    const itemId = createRes.body.item.id;

    const listRes = await request(app).get("/api/compliance/items").set("Authorization", finance.authHeader);
    expect(listRes.body.items.some((i: { id: string }) => i.id === itemId)).toBe(true);

    const toggleOnRes = await request(app)
      .patch(`/api/compliance/items/${itemId}`)
      .set("Authorization", finance.authHeader)
      .send({ isDone: true });
    expect(toggleOnRes.status).toBe(200);
    expect(toggleOnRes.body.item.isDone).toBe(true);
    expect(toggleOnRes.body.item.completedBy.id).toBe(finance.id);
    expect(toggleOnRes.body.item.completedAt).toBeTruthy();

    const toggleOffRes = await request(app)
      .patch(`/api/compliance/items/${itemId}`)
      .set("Authorization", finance.authHeader)
      .send({ isDone: false });
    expect(toggleOffRes.body.item.isDone).toBe(false);
    expect(toggleOffRes.body.item.completedBy).toBeNull();

    const deleteRes = await request(app).delete(`/api/compliance/items/${itemId}`).set("Authorization", finance.authHeader);
    expect(deleteRes.status).toBe(204);

    const listAfter = await request(app).get("/api/compliance/items").set("Authorization", finance.authHeader);
    expect(listAfter.body.items.some((i: { id: string }) => i.id === itemId)).toBe(false);
  });

  it("rejects a label under 2 characters", async () => {
    const finance = await createTestUser("finance");
    const res = await request(app).post("/api/compliance/items").set("Authorization", finance.authHeader).send({ label: "x" });
    expect(res.status).toBe(400);
  });

  it("404s toggling an unknown item", async () => {
    const finance = await createTestUser("finance");
    const res = await request(app)
      .patch("/api/compliance/items/00000000-0000-0000-0000-000000000000")
      .set("Authorization", finance.authHeader)
      .send({ isDone: true });
    expect(res.status).toBe(404);
  });
});
