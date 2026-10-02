import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("Public content endpoints", () => {
  it("exposes navbar items, footer columns and content entries without auth", async () => {
    const navRes = await request(app).get("/api/content/navbar-items");
    expect(navRes.status).toBe(200);
    expect(Array.isArray(navRes.body.items)).toBe(true);

    const footerRes = await request(app).get("/api/content/footer-columns");
    expect(footerRes.status).toBe(200);
    expect(Array.isArray(footerRes.body.columns)).toBe(true);

    const entriesRes = await request(app).get("/api/content/entries");
    expect(entriesRes.status).toBe(200);
    expect(Array.isArray(entriesRes.body.entries)).toBe(true);
  });

  it("only lists visible navbar items on the public endpoint", async () => {
    const admin = await createTestUser("admin");
    const created = await request(app)
      .post("/api/content/navbar-items")
      .set("Authorization", admin.authHeader)
      .send({ label: "Caché", url: "/caché", visible: false });
    expect(created.status).toBe(201);

    const publicRes = await request(app).get("/api/content/navbar-items");
    expect(publicRes.body.items.some((i: { id: string }) => i.id === created.body.item.id)).toBe(false);

    const allRes = await request(app).get("/api/content/navbar-items/all").set("Authorization", admin.authHeader);
    expect(allRes.body.items.some((i: { id: string }) => i.id === created.body.item.id)).toBe(true);

    await request(app).delete(`/api/content/navbar-items/${created.body.item.id}`).set("Authorization", admin.authHeader);
  });
});

describe("Content management permission gate", () => {
  it("rejects a caller without content.manage from every write endpoint", async () => {
    const hacker = await createTestUser("hacker");

    const navCreate = await request(app)
      .post("/api/content/navbar-items")
      .set("Authorization", hacker.authHeader)
      .send({ label: "X", url: "/x" });
    expect(navCreate.status).toBe(403);

    const entryUpsert = await request(app)
      .put("/api/content/entries")
      .set("Authorization", hacker.authHeader)
      .send({ key: "test.key", type: "text", value: "v" });
    expect(entryUpsert.status).toBe(403);

    const footerCreate = await request(app)
      .post("/api/content/footer-columns")
      .set("Authorization", hacker.authHeader)
      .send({ title: "X" });
    expect(footerCreate.status).toBe(403);
  });
});

describe("Content entries CRUD", () => {
  it("upserts a text entry by key, then a json entry, rejecting invalid JSON", async () => {
    const admin = await createTestUser("admin");

    const createRes = await request(app)
      .put("/api/content/entries")
      .set("Authorization", admin.authHeader)
      .send({ key: "test.hero.title", type: "text", value: "Bienvenue" });
    expect(createRes.status).toBe(200);
    expect(createRes.body.entry.value).toBe("Bienvenue");

    const updateRes = await request(app)
      .put("/api/content/entries")
      .set("Authorization", admin.authHeader)
      .send({ key: "test.hero.title", type: "text", value: "Bienvenue 2" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.entry.id).toBe(createRes.body.entry.id);
    expect(updateRes.body.entry.value).toBe("Bienvenue 2");

    const jsonRes = await request(app)
      .put("/api/content/entries")
      .set("Authorization", admin.authHeader)
      .send({ key: "test.sections", type: "json", value: JSON.stringify([{ title: "A" }]) });
    expect(jsonRes.status).toBe(200);

    const invalidJsonRes = await request(app)
      .put("/api/content/entries")
      .set("Authorization", admin.authHeader)
      .send({ key: "test.sections.bad", type: "json", value: "{not valid" });
    expect(invalidJsonRes.status).toBe(400);
  });

  it("deletes an entry", async () => {
    const admin = await createTestUser("admin");
    const createRes = await request(app)
      .put("/api/content/entries")
      .set("Authorization", admin.authHeader)
      .send({ key: "test.deletable", type: "text", value: "v" });

    const deleteRes = await request(app)
      .delete(`/api/content/entries/${createRes.body.entry.id}`)
      .set("Authorization", admin.authHeader);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get("/api/content/entries");
    expect(listRes.body.entries.some((e: { id: string }) => e.id === createRes.body.entry.id)).toBe(false);
  });
});

describe("Navbar items CRUD and reorder", () => {
  it("creates, updates, reorders and deletes navbar items", async () => {
    const admin = await createTestUser("admin");

    const a = await request(app).post("/api/content/navbar-items").set("Authorization", admin.authHeader).send({ label: "A", url: "/a" });
    const b = await request(app).post("/api/content/navbar-items").set("Authorization", admin.authHeader).send({ label: "B", url: "/b" });
    expect(a.status).toBe(201);
    expect(b.body.item.order).toBe(a.body.item.order + 1);

    const updateRes = await request(app)
      .patch(`/api/content/navbar-items/${a.body.item.id}`)
      .set("Authorization", admin.authHeader)
      .send({ label: "A modifié" });
    expect(updateRes.body.item.label).toBe("A modifié");

    const reorderRes = await request(app)
      .post("/api/content/navbar-items/reorder")
      .set("Authorization", admin.authHeader)
      .send({ ids: [b.body.item.id, a.body.item.id] });
    expect(reorderRes.status).toBe(200);
    const bAfter = reorderRes.body.items.find((i: { id: string }) => i.id === b.body.item.id);
    const aAfter = reorderRes.body.items.find((i: { id: string }) => i.id === a.body.item.id);
    expect(bAfter.order).toBeLessThan(aAfter.order);

    const deleteRes = await request(app).delete(`/api/content/navbar-items/${a.body.item.id}`).set("Authorization", admin.authHeader);
    expect(deleteRes.status).toBe(204);
    await request(app).delete(`/api/content/navbar-items/${b.body.item.id}`).set("Authorization", admin.authHeader);
  });

  it("rejects a reorder list that doesn't match existing ids", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app)
      .post("/api/content/navbar-items/reorder")
      .set("Authorization", admin.authHeader)
      .send({ ids: ["00000000-0000-0000-0000-000000000000"] });
    expect(res.status).toBe(400);
  });
});

describe("Footer columns and links CRUD", () => {
  it("creates a column, adds links, reorders links, then deletes the column (cascades links)", async () => {
    const admin = await createTestUser("admin");

    const columnRes = await request(app).post("/api/content/footer-columns").set("Authorization", admin.authHeader).send({ title: "Légal" });
    expect(columnRes.status).toBe(201);
    const columnId = columnRes.body.column.id;

    const linkA = await request(app)
      .post("/api/content/footer-links")
      .set("Authorization", admin.authHeader)
      .send({ columnId, label: "CGU", url: "/cgu" });
    const linkB = await request(app)
      .post("/api/content/footer-links")
      .set("Authorization", admin.authHeader)
      .send({ columnId, label: "Confidentialité", url: "/confidentialite" });
    expect(linkA.status).toBe(201);
    expect(linkB.body.link.order).toBe(linkA.body.link.order + 1);

    const reorderRes = await request(app)
      .post("/api/content/footer-links/reorder")
      .set("Authorization", admin.authHeader)
      .send({ columnId, ids: [linkB.body.link.id, linkA.body.link.id] });
    expect(reorderRes.status).toBe(200);
    const column = reorderRes.body.columns.find((c: { id: string }) => c.id === columnId);
    expect(column.links[0].id).toBe(linkB.body.link.id);

    const deleteRes = await request(app).delete(`/api/content/footer-columns/${columnId}`).set("Authorization", admin.authHeader);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get("/api/content/footer-columns");
    expect(listRes.body.columns.some((c: { id: string }) => c.id === columnId)).toBe(false);
  });
});

describe("CMS links accept only safe targets", () => {
  it("rejects script-bearing and protocol-relative targets on navbar and footer links", async () => {
    const admin = await createTestUser("admin");
    for (const url of ["javascript:alert(1)", "data:text/html,x", "//evil.example/x", "vbscript:x"]) {
      const nav = await request(app).post("/api/content/navbar-items").set("Authorization", admin.authHeader).send({ label: "Piège", url });
      expect(nav.status, url).toBe(400);
    }

    const column = await request(app).post("/api/content/footer-columns").set("Authorization", admin.authHeader).send({ title: "Col sécurité" });
    const link = await request(app)
      .post("/api/content/footer-links")
      .set("Authorization", admin.authHeader)
      .send({ columnId: column.body.column.id, label: "Piège", url: "javascript:alert(1)" });
    expect(link.status).toBe(400);
    const patch = await request(app)
      .post("/api/content/footer-links")
      .set("Authorization", admin.authHeader)
      .send({ columnId: column.body.column.id, label: "Ok", url: "/contact" });
    const patched = await request(app)
      .patch(`/api/content/footer-links/${patch.body.link.id}`)
      .set("Authorization", admin.authHeader)
      .send({ url: "javascript:alert(1)" });
    expect(patched.status).toBe(400);
  });

  it("accepts internal paths and http(s)/mailto/tel URLs", async () => {
    const admin = await createTestUser("admin");
    for (const url of ["/programmes", "https://example.ga/a?b=1", "mailto:contact@example.ga", "tel:+24101020304"]) {
      const res = await request(app).post("/api/content/navbar-items").set("Authorization", admin.authHeader).send({ label: "Ok", url });
      expect(res.status, url).toBe(201);
    }
  });
});
