import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("Programmes RBAC & CRUD", () => {
  it("rejects listing without a token", async () => {
    const res = await request(app).get("/api/programmes");
    expect(res.status).toBe(401);
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
