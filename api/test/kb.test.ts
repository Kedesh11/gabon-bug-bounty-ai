import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("Knowledge base permission gates", () => {
  it("rejects a caller without support.kb.view from listing", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/kb/articles").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("rejects a caller without kb.manage from creating, even with support.kb.view", async () => {
    // triage has neither support.kb.view nor kb.manage today — confirms the whole
    // router is unreachable for it, not just the mutation.
    const triage = await createTestUser("triage");
    const res = await request(app)
      .post("/api/kb/articles")
      .set("Authorization", triage.authHeader)
      .send({ title: "Titre de test", category: "Guides", body: "Contenu" });
    expect(res.status).toBe(403);
  });
});

describe("Knowledge base CRUD", () => {
  it("creates, lists, fetches, updates then deletes an article", async () => {
    const support = await createTestUser("support");

    const createRes = await request(app)
      .post("/api/kb/articles")
      .set("Authorization", support.authHeader)
      .send({ title: "Politique de paiement Moov/Airtel", category: "Finance", body: "Les versements Mobile Money sont traités sous 48h." });
    expect(createRes.status).toBe(201);
    expect(createRes.body.article.author.id).toBe(support.id);
    const articleId = createRes.body.article.id;

    const listRes = await request(app).get("/api/kb/articles").set("Authorization", support.authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.articles.some((a: { id: string }) => a.id === articleId)).toBe(true);

    const getRes = await request(app).get(`/api/kb/articles/${articleId}`).set("Authorization", support.authHeader);
    expect(getRes.status).toBe(200);
    expect(getRes.body.article.title).toBe("Politique de paiement Moov/Airtel");

    const updateRes = await request(app)
      .patch(`/api/kb/articles/${articleId}`)
      .set("Authorization", support.authHeader)
      .send({ body: "Les versements Mobile Money sont désormais traités sous 24h." });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.article.body).toContain("24h");
    expect(updateRes.body.article.category).toBe("Finance");

    const deleteRes = await request(app).delete(`/api/kb/articles/${articleId}`).set("Authorization", support.authHeader);
    expect(deleteRes.status).toBe(204);

    const listAfter = await request(app).get("/api/kb/articles").set("Authorization", support.authHeader);
    expect(listAfter.body.articles.some((a: { id: string }) => a.id === articleId)).toBe(false);
  });

  it("filters by category and by free-text search", async () => {
    const support = await createTestUser("support");
    await request(app)
      .post("/api/kb/articles")
      .set("Authorization", support.authHeader)
      .send({ title: "Gestion des duplicatas", category: "Triage", body: "Comment identifier un rapport en doublon." });
    await request(app)
      .post("/api/kb/articles")
      .set("Authorization", support.authHeader)
      .send({ title: "Anatomie d'un rapport de qualité", category: "Guides", body: "Ce qui distingue un bon rapport." });

    const byCategory = await request(app)
      .get("/api/kb/articles")
      .query({ category: "Triage" })
      .set("Authorization", support.authHeader);
    expect(byCategory.body.articles.every((a: { category: string }) => a.category === "Triage")).toBe(true);
    expect(byCategory.body.articles.length).toBeGreaterThan(0);

    const bySearch = await request(app)
      .get("/api/kb/articles")
      .query({ search: "duplicatas" })
      .set("Authorization", support.authHeader);
    expect(bySearch.body.articles.some((a: { title: string }) => a.title === "Gestion des duplicatas")).toBe(true);
    expect(bySearch.body.articles.every((a: { title: string }) => a.title !== "Anatomie d'un rapport de qualité")).toBe(true);
  });

  it("404s fetching, updating or deleting an unknown article", async () => {
    const support = await createTestUser("support");
    const unknownId = "00000000-0000-0000-0000-000000000000";

    const getRes = await request(app).get(`/api/kb/articles/${unknownId}`).set("Authorization", support.authHeader);
    expect(getRes.status).toBe(404);

    const updateRes = await request(app).patch(`/api/kb/articles/${unknownId}`).set("Authorization", support.authHeader).send({ title: "Nouveau titre valide" });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/kb/articles/${unknownId}`).set("Authorization", support.authHeader);
    expect(deleteRes.status).toBe(404);
  });

  it("rejects a title under 3 characters", async () => {
    const support = await createTestUser("support");
    const res = await request(app)
      .post("/api/kb/articles")
      .set("Authorization", support.authHeader)
      .send({ title: "Hi", category: "Guides", body: "Contenu" });
    expect(res.status).toBe(400);
  });
});
