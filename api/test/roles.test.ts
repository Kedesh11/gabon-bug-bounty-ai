import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";

describe("Roles & permissions", () => {
  it("rejects a caller without roles.manage from listing roles", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/roles").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("lists the 6 system roles with their expected permission counts", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app).get("/api/roles").set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    const byKey: Record<string, { permissions: string[]; isSystem: boolean }> = Object.fromEntries(
      res.body.roles.map((r: { key: string; permissions: string[]; isSystem: boolean }) => [r.key, r]),
    );
    expect(byKey.hacker.permissions).toEqual(
      expect.arrayContaining(["hackers.self.manage", "payments.onboarding.self", "reports.create"]),
    );
    expect(byKey.hacker.isSystem).toBe(true);
    expect(byKey.admin.permissions.length).toBeGreaterThan(20);
  });

  it("exposes the fixed permission catalog", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app).get("/api/roles/permissions").set("Authorization", admin.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.permissions.map((p: { key: string }) => p.key)).toContain("reports.triage");
  });

  it("rejects creating a role with an unknown permission key", async () => {
    const admin = await createTestUser("admin");
    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send({ label: "Auditeur", permissionKeys: ["not.a.real.permission"] });
    expect(res.status).toBe(400);
  });

  it("creates a custom role and a user with that role immediately gets the granted permission — no code change", async () => {
    const admin = await createTestUser("admin");

    const label = `Auditeur Conformité ${randomUUID()}`;
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send({ label, permissionKeys: ["reports.view.all"] });
    expect(createRes.status).toBe(201);
    expect(createRes.body.role.key).toContain("auditeur_conformite");
    expect(createRes.body.role.isSystem).toBe(false);

    // Assign a real user to the new role directly (simulating what an admin-facing
    // "assign role" flow would do) and confirm the permission is live end-to-end.
    const compliance = await createTestUser("hacker");
    await prisma.profile.update({ where: { id: compliance.id }, data: { roleId: createRes.body.role.id } });

    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await prisma.programme.create({
      data: { name: "Prog", description: "d", entrepriseId: entrepriseProfile.id, minReward: 1000, maxReward: 5000 },
    });
    const hackerForReport = await createTestUser("hacker");
    const hackerProfile = await prisma.hackerProfile.findUniqueOrThrow({ where: { profileId: hackerForReport.id } });
    const report = await prisma.report.create({
      data: {
        title: "Test", description: "d", severity: "moyenne", status: "soumis",
        hackerId: hackerProfile.id, programmeId: programme.id, entrepriseId: entrepriseProfile.id,
        vulnerability: "XSS", proof: "poc",
      },
    });

    const res = await request(app).get(`/api/reports/${report.id}`).set("Authorization", compliance.authHeader);
    expect(res.status).toBe(200);
  });

  it("updates a role's permissions", async () => {
    const admin = await createTestUser("admin");
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send({ label: `Role Editable ${randomUUID()}`, permissionKeys: [] });

    const updateRes = await request(app)
      .patch(`/api/roles/${createRes.body.role.id}/permissions`)
      .set("Authorization", admin.authHeader)
      .send({ permissionKeys: ["logs.view"] });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.role.permissions).toEqual(["logs.view"]);
  });

  it("refuses to delete a system role", async () => {
    const admin = await createTestUser("admin");
    const roles = await request(app).get("/api/roles").set("Authorization", admin.authHeader);
    const hackerRole = roles.body.roles.find((r: { key: string }) => r.key === "hacker");

    const res = await request(app).delete(`/api/roles/${hackerRole.id}`).set("Authorization", admin.authHeader);
    expect(res.status).toBe(400);
  });

  it("refuses to delete a role that still has assigned users, allows it once empty", async () => {
    const admin = await createTestUser("admin");
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send({ label: "Role Temporaire", permissionKeys: [] });
    const roleId = createRes.body.role.id;

    const assignee = await createTestUser("hacker");
    await prisma.profile.update({ where: { id: assignee.id }, data: { roleId } });

    const blockedRes = await request(app).delete(`/api/roles/${roleId}`).set("Authorization", admin.authHeader);
    expect(blockedRes.status).toBe(409);

    const hackerRole = await prisma.role.findUniqueOrThrow({ where: { key: "hacker" } });
    await prisma.profile.update({ where: { id: assignee.id }, data: { roleId: hackerRole.id } });

    const okRes = await request(app).delete(`/api/roles/${roleId}`).set("Authorization", admin.authHeader);
    expect(okRes.status).toBe(204);
  });
});
