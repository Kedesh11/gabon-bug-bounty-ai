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

describe("Admin taxonomy management", () => {
  it("rejects a caller without taxonomy.manage from creating/editing/deleting categories", async () => {
    const hacker = await createTestUser("hacker");
    const createRes = await request(app)
      .post("/api/taxonomy/vulnerability-categories/manage")
      .set("Authorization", hacker.authHeader)
      .send({ name: "Faille interdite" });
    expect(createRes.status).toBe(403);

    const seeded = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "csrf" } });
    const patchRes = await request(app)
      .patch(`/api/taxonomy/vulnerability-categories/${seeded.id}`)
      .set("Authorization", hacker.authHeader)
      .send({ description: "hack" });
    expect(patchRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/taxonomy/vulnerability-categories/${seeded.id}`)
      .set("Authorization", hacker.authHeader);
    expect(deleteRes.status).toBe(403);
  });

  it("lets an admin create a fully-specified category with CWE, severity, and a parent", async () => {
    const admin = await createTestUser("admin");
    const parent = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "misconfiguration" } });
    const name = `Sous-catégorie admin ${randomUUID()}`;

    const res = await request(app)
      .post("/api/taxonomy/vulnerability-categories/manage")
      .set("Authorization", admin.authHeader)
      .send({ name, cweId: "CWE-1004", defaultSeverity: "moyenne", description: "Créée par un admin", parentId: parent.id });
    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe(name);
    expect(res.body.category.cweId).toBe("CWE-1004");
    expect(res.body.category.parentId).toBe(parent.id);
    expect(res.body.category.isSystem).toBe(false);
  });

  it("lets an admin complete a hacker-proposed category with CWE/severity/hierarchy", async () => {
    const hacker = await createTestUser("hacker");
    const admin = await createTestUser("admin");
    const name = `Faille brute ${randomUUID()}`;

    const proposeRes = await request(app)
      .post("/api/taxonomy/vulnerability-categories")
      .set("Authorization", hacker.authHeader)
      .send({ name });
    expect(proposeRes.body.category.cweId).toBeNull();

    const patchRes = await request(app)
      .patch(`/api/taxonomy/vulnerability-categories/${proposeRes.body.category.id}`)
      .set("Authorization", admin.authHeader)
      .send({ cweId: "CWE-200", defaultSeverity: "haute" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.category.cweId).toBe("CWE-200");
    expect(patchRes.body.category.defaultSeverity).toBe("haute");
  });

  it("refuses to make a category its own ancestor", async () => {
    const admin = await createTestUser("admin");
    const parent = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "misconfiguration" } });
    const child = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "misconfiguration.cors" } });

    const res = await request(app)
      .patch(`/api/taxonomy/vulnerability-categories/${parent.id}`)
      .set("Authorization", admin.authHeader)
      .send({ parentId: child.id });
    expect(res.status).toBe(400);
  });

  it("refuses to delete a system (seeded) category", async () => {
    const admin = await createTestUser("admin");
    const seeded = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "rce" } });

    const res = await request(app).delete(`/api/taxonomy/vulnerability-categories/${seeded.id}`).set("Authorization", admin.authHeader);
    expect(res.status).toBe(400);
  });

  it("refuses to delete a non-system category still referenced by a report, allows it once unused", async () => {
    const admin = await createTestUser("admin");
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await prisma.programme.create({
      data: { name: "Prog taxo", description: "d", entrepriseId: entrepriseProfile.id, minReward: 1000, maxReward: 5000 },
    });

    const createRes = await request(app)
      .post("/api/taxonomy/vulnerability-categories/manage")
      .set("Authorization", admin.authHeader)
      .send({ name: `Catégorie jetable ${randomUUID()}` });
    const categoryId = createRes.body.category.id;

    const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hacker.id } });
    const report = await prisma.report.create({
      data: {
        title: "Rapport lié à la catégorie",
        description: "d",
        severity: "moyenne",
        status: "soumis",
        hackerId: hackerProfile.id,
        programmeId: programme.id,
        entrepriseId: entrepriseProfile.id,
        vulnerability: "X",
        proof: "poc",
        vulnerabilityCategoryId: categoryId,
      },
    });

    const blockedRes = await request(app).delete(`/api/taxonomy/vulnerability-categories/${categoryId}`).set("Authorization", admin.authHeader);
    expect(blockedRes.status).toBe(409);

    await prisma.report.update({ where: { id: report.id }, data: { vulnerabilityCategoryId: null } });

    const okRes = await request(app).delete(`/api/taxonomy/vulnerability-categories/${categoryId}`).set("Authorization", admin.authHeader);
    expect(okRes.status).toBe(204);
  });
});
