import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";

// programmes.validate has no default role in DEFAULT_ROLE_PERMISSIONS (deliberately —
// it's fully configurable via the roles UI) — grant it the same way an admin would:
// create a custom role holding it, then assign a test user to that role.
async function createValidatorUser() {
  const admin = await createTestUser("admin");
  const roleRes = await request(app)
    .post("/api/roles")
    .set("Authorization", admin.authHeader)
    .send({
      label: `Validateur ${randomUUID()}`,
      permissionKeys: ["programmes.validate"],
      name: "Validateur Test",
      email: `validateur-${randomUUID()}@example.com`,
      password: "MotDePasse123!",
    });
  const validator = await createTestUser("hacker");
  await prisma.profile.update({ where: { id: validator.id }, data: { roleId: roleRes.body.role.id } });
  return validator;
}

describe("Programmes RBAC & CRUD", () => {
  it("allows listing without a token (public catalogue)", async () => {
    const res = await request(app).get("/api/programmes");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.programmes)).toBe(true);
  });

  it("allows listing with any authenticated role", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/programmes").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.programmes)).toBe(true);
  });

  it("rejects programme creation for a hacker", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .post("/api/programmes")
      .set("Authorization", hacker.authHeader)
      .send({ name: "Test", description: "desc", minReward: 1000, maxReward: 5000 });
    expect(res.status).toBe(403);
  });

  it("allows an entreprise to create and read its own programme", async () => {
    const entreprise = await createTestUser("entreprise");

    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({
        name: "API Gouvernementale",
        description: "Programme de test",
        minReward: 10000,
        maxReward: 200000,
        rewardTiers: [{ severity: "haute", min: 50000, max: 100000 }],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.programme.name).toBe("API Gouvernementale");
    expect(createRes.body.programme.rewardTiers).toHaveLength(1);

    const getRes = await request(app)
      .get(`/api/programmes/${createRes.body.programme.id}`)
      .set("Authorization", entreprise.authHeader);
    expect(getRes.status).toBe(200);
    expect(getRes.body.programme.id).toBe(createRes.body.programme.id);
  });

  it("prevents an entreprise from updating another entreprise's programme", async () => {
    const owner = await createTestUser("entreprise");
    const intruder = await createTestUser("entreprise");

    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", owner.authHeader)
      .send({ name: "Programme privé", description: "desc", minReward: 1000, maxReward: 5000 });

    const patchRes = await request(app)
      .patch(`/api/programmes/${createRes.body.programme.id}`)
      .set("Authorization", intruder.authHeader)
      .send({ name: "Modifié par un intrus" });

    expect(patchRes.status).toBe(403);
  });
});

describe("Programme validation workflow", () => {
  it("hides a newly submitted programme from the public catalogue until validated", async () => {
    const entreprise = await createTestUser("entreprise");
    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `En Attente ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });
    expect(createRes.body.programme.validationStatus).toBe("en_attente");

    const publicRes = await request(app).get("/api/programmes");
    expect(publicRes.body.programmes.some((p: { id: string }) => p.id === createRes.body.programme.id)).toBe(false);

    const mineRes = await request(app).get("/api/programmes/mine").set("Authorization", entreprise.authHeader);
    expect(mineRes.body.programmes.some((p: { id: string }) => p.id === createRes.body.programme.id)).toBe(true);
  });

  it("rejects /review and PATCH .../validation for a caller without programmes.validate", async () => {
    const entreprise = await createTestUser("entreprise");
    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `Sans Permission ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });

    const reviewRes = await request(app).get("/api/programmes/review").set("Authorization", entreprise.authHeader);
    expect(reviewRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/api/programmes/${createRes.body.programme.id}/validation`)
      .set("Authorization", entreprise.authHeader)
      .send({ decision: "valide" });
    expect(patchRes.status).toBe(403);
  });

  it("makes a programme public once approved by a holder of programmes.validate", async () => {
    const entreprise = await createTestUser("entreprise");
    const validator = await createValidatorUser();

    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `À Valider ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });
    const id = createRes.body.programme.id;

    const reviewRes = await request(app).get("/api/programmes/review?validationStatus=en_attente").set("Authorization", validator.authHeader);
    expect(reviewRes.body.programmes.some((p: { id: string }) => p.id === id)).toBe(true);

    const validateRes = await request(app)
      .patch(`/api/programmes/${id}/validation`)
      .set("Authorization", validator.authHeader)
      .send({ decision: "valide" });
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.programme.validationStatus).toBe("valide");
    expect(validateRes.body.programme.validatedById).toBe(validator.id);

    const publicRes = await request(app).get("/api/programmes");
    expect(publicRes.body.programmes.some((p: { id: string }) => p.id === id)).toBe(true);
  });

  it("requires a rejection reason and keeps a refused programme out of the public catalogue", async () => {
    const entreprise = await createTestUser("entreprise");
    const validator = await createValidatorUser();

    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `À Refuser ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });
    const id = createRes.body.programme.id;

    const noReasonRes = await request(app)
      .patch(`/api/programmes/${id}/validation`)
      .set("Authorization", validator.authHeader)
      .send({ decision: "refuse" });
    expect(noReasonRes.status).toBe(400);

    const refuseRes = await request(app)
      .patch(`/api/programmes/${id}/validation`)
      .set("Authorization", validator.authHeader)
      .send({ decision: "refuse", rejectionReason: "Scope insuffisamment précis" });
    expect(refuseRes.status).toBe(200);
    expect(refuseRes.body.programme.validationStatus).toBe("refuse");

    const publicRes = await request(app).get("/api/programmes");
    expect(publicRes.body.programmes.some((p: { id: string }) => p.id === id)).toBe(false);

    const mineRes = await request(app).get("/api/programmes/mine").set("Authorization", entreprise.authHeader);
    const mine = mineRes.body.programmes.find((p: { id: string }) => p.id === id);
    expect(mine.rejectionReason).toBe("Scope insuffisamment précis");
  });
});

describe("Programme slugs", () => {
  it("generates a real, URL-safe slug from the name on creation", async () => {
    const entreprise = await createTestUser("entreprise");
    const res = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `Programme Été Spécial ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.programme.slug).toMatch(/^programme-ete-special-[0-9a-f-]+$/);
  });

  it("dedupes colliding slugs with a numeric suffix instead of rejecting", async () => {
    const entreprise = await createTestUser("entreprise");
    const name = `Nom Identique ${randomUUID()}`;

    const first = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name, description: "desc", minReward: 1000, maxReward: 5000 });
    const second = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name, description: "desc", minReward: 1000, maxReward: 5000 });

    expect(first.body.programme.slug).not.toBe(second.body.programme.slug);
    expect(second.body.programme.slug).toBe(`${first.body.programme.slug}-2`);
  });

  it("resolves a programme by slug or by UUID — both keep working", async () => {
    const admin = await createTestUser("admin");
    const entreprise = await createTestUser("entreprise");
    const createRes = await request(app)
      .post("/api/programmes")
      .set("Authorization", entreprise.authHeader)
      .send({ name: `Double Accès ${randomUUID()}`, description: "desc", minReward: 1000, maxReward: 5000 });
    const { id, slug } = createRes.body.programme;

    const bySlug = await request(app).get(`/api/programmes/${slug}`).set("Authorization", admin.authHeader);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.programme.id).toBe(id);

    const byId = await request(app).get(`/api/programmes/${id}`).set("Authorization", admin.authHeader);
    expect(byId.status).toBe(200);
    expect(byId.body.programme.slug).toBe(slug);
  });

  it("404s a slug-shaped identifier that doesn't exist", async () => {
    const res = await request(app).get("/api/programmes/does-not-exist-at-all");
    expect(res.status).toBe(404);
  });
});
