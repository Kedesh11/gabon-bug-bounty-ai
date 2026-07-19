import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";

describe("Vulnerability taxonomy", () => {
  it("exposes the VRT catalog with CWE mappings and hierarchy, no auth required", async () => {
    const res = await request(app).get("/api/taxonomy/vulnerability-categories");
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(20);

    const byKey: Record<string, { id: string; cweId: string | null; parentId: string | null }> = Object.fromEntries(
      res.body.categories.map((c: { key: string; id: string; cweId: string | null; parentId: string | null }) => [c.key, c]),
    );

    expect(byKey["injection.sql"].cweId).toBe("CWE-89");
    // Leaf category's parentId should resolve to the top-level "xss" category's id.
    expect(byKey["xss.stored"].parentId).toBe(byKey["xss"].id);
  });
});

describe("Hacker-proposed vulnerability categories", () => {
  it("rejects a caller without reports.create from proposing a category", async () => {
    const entreprise = await createTestUser("entreprise");
    const res = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", entreprise.authHeader)
      .send({ name: "Nouvelle faille" });
    expect(res.status).toBe(403);
  });

  it("creates a genuinely new, non-system category and it appears in the public list", async () => {
    const hacker = await createTestUser("hacker");
    const name = `Faille exotique ${randomUUID()}`;

    const res = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", hacker.authHeader)
      .send({ name });
    expect(res.status).toBe(201);
    expect(res.body.reused).toBe(false);
    expect(res.body.category.name).toBe(name);
    expect(res.body.category.isSystem).toBe(false);

    const listRes = await request(app).get("/api/taxonomy/vulnerability-categories");
    expect(listRes.body.categories.some((c: { id: string }) => c.id === res.body.category.id)).toBe(true);
  });

  it("reuses an existing seeded category instead of creating a near-duplicate", async () => {
    const hacker = await createTestUser("hacker");
    const before = await prisma.vulnerabilityCategory.count();

    const res = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", hacker.authHeader)
      .send({ name: "injection   SQL" }); // casing/spacing variant of the seeded "Injection SQL"
    expect(res.status).toBe(200);
    expect(res.body.reused).toBe(true);

    const seeded = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "injection.sql" } });
    expect(res.body.category.id).toBe(seeded.id);

    const after = await prisma.vulnerabilityCategory.count();
    expect(after).toBe(before);
  });

  it("reuses a category another hacker already proposed for a near-identical name", async () => {
    const hackerA = await createTestUser("hacker");
    const hackerB = await createTestUser("hacker");
    const name = `Contournement Portefeuille ${randomUUID()}`;

    const first = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", hackerA.authHeader)
      .send({ name });
    expect(first.body.reused).toBe(false);

    const second = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", hackerB.authHeader)
      .send({ name: name.toUpperCase() });
    expect(second.status).toBe(200);
    expect(second.body.reused).toBe(true);
    expect(second.body.category.id).toBe(first.body.category.id);
  });
});
