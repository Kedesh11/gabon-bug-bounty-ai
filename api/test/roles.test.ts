import { randomUUID } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

function newRoleProvisioningBody(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  return {
    label: `Role ${id}`,
    permissionKeys: [] as string[],
    name: "Personne Test",
    email: `staff-${id}@example.com`,
    password: "MotDePasse123!",
    ...overrides,
  };
}

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
      .send(newRoleProvisioningBody({ label: "Auditeur", permissionKeys: ["not.a.real.permission"] }));
    expect(res.status).toBe(400);
  });

  it("creates a custom role AND its first staff account in one step — the account immediately gets the granted permission", async () => {
    const admin = await createTestUser("admin");

    const label = `Auditeur Conformité ${randomUUID()}`;
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send(newRoleProvisioningBody({ label, permissionKeys: ["reports.view.all"] }));
    expect(createRes.status).toBe(201);
    expect(createRes.body.role.key).toContain("auditeur_conformite");
    expect(createRes.body.role.isSystem).toBe(false);
    expect(createRes.body.profile.role).toBe(createRes.body.role.key);
    expect(createRes.body.profile.permissions).toContain("reports.view.all");
    // No RESEND_API_KEY in the test environment — the flow must still succeed and
    // report the email as not sent, rather than fail the whole request.
    expect(createRes.body.emailSent).toBe(false);
    expect(createRes.body.emailError).toBeTruthy();

    // The profile created by role provisioning above has no test-harness auth token
    // registered (it went through a real supabaseAdmin.auth.admin.createUser call) —
    // verify permission propagation via a direct DB-role reassignment on a normal
    // test user instead, same end-to-end intent as before this change.
    const complianceUser = await createTestUser("hacker");
    await prisma.profile.update({ where: { id: complianceUser.id }, data: { roleId: createRes.body.role.id } });

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

    const res = await request(app).get(`/api/reports/${report.id}`).set("Authorization", complianceUser.authHeader);
    expect(res.status).toBe(200);
  });

  it("updates a role's permissions", async () => {
    const admin = await createTestUser("admin");
    const createRes = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send(newRoleProvisioningBody({ label: `Role Editable ${randomUUID()}` }));

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
      .send(newRoleProvisioningBody({ label: `Role Temporaire ${randomUUID()}` }));
    const roleId = createRes.body.role.id;
    // Role creation now also provisions its first account (createRes.body.profile) —
    // the role already has one assignee before this test adds a second one.

    const assignee = await createTestUser("hacker");
    await prisma.profile.update({ where: { id: assignee.id }, data: { roleId } });

    const blockedRes = await request(app).delete(`/api/roles/${roleId}`).set("Authorization", admin.authHeader);
    expect(blockedRes.status).toBe(409);

    const hackerRole = await prisma.role.findUniqueOrThrow({ where: { key: "hacker" } });
    await prisma.profile.update({ where: { id: assignee.id }, data: { roleId: hackerRole.id } });
    await prisma.profile.update({ where: { id: createRes.body.profile.id }, data: { roleId: hackerRole.id } });

    const okRes = await request(app).delete(`/api/roles/${roleId}`).set("Authorization", admin.authHeader);
    expect(okRes.status).toBe(204);
  });

  it("rolls back the role if Supabase Auth account creation fails", async () => {
    const admin = await createTestUser("admin");
    const label = `Role Orphelin ${randomUUID()}`;

    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Email déjà utilisé" },
    } as never);

    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send(newRoleProvisioningBody({ label }));
    expect(res.status).toBe(400);

    const roleByLabel = await prisma.role.findFirst({ where: { label } });
    expect(roleByLabel).toBeNull();
  });

  it("rolls back the role and the orphaned Supabase user if the Profile insert fails", async () => {
    const admin = await createTestUser("admin");
    const existing = await createTestUser("hacker");
    const label = `Role Conflit ${randomUUID()}`;

    // Force the "new" Supabase user id to collide with an already-existing Profile id,
    // so prisma.profile.create hits the primary key uniqueness constraint.
    vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValueOnce({
      data: { user: { id: existing.id } },
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/roles")
      .set("Authorization", admin.authHeader)
      .send(newRoleProvisioningBody({ label }));
    expect(res.status).toBe(500);

    const roleByLabel = await prisma.role.findFirst({ where: { label } });
    expect(roleByLabel).toBeNull();
    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(existing.id);

    // The pre-existing profile itself must be untouched by the failed attempt.
    const untouched = await prisma.profile.findUniqueOrThrow({ where: { id: existing.id } });
    expect(untouched.email).toBe(existing.email);
  });
});
