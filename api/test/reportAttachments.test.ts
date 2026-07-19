import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser, createTestProgramme } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import { storageMocks } from "./setup.js";

async function createTestReport(hackerAuthHeader: string, programmeId: string) {
  const res = await request(app)
    .post("/api/reports")
    .set("Authorization", hackerAuthHeader)
    .send({
      title: "Rapport de test pour pièce jointe",
      description: "Description de test",
      severity: "moyenne",
      programmeId,
      vulnerability: "XSS",
      proof: "poc",
    });
  return res.body.report as { id: string };
}

describe("Report PDF attachment upload", () => {
  it("lets a hacker upload a PDF to their own report and persists it", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const report = await createTestReport(hacker.authHeader, programme.id);

    const res = await request(app)
      .post(`/api/reports/${report.id}/pdf`)
      .set("Authorization", hacker.authHeader)
      .attach("file", Buffer.from("%PDF-1.4 fake content"), { filename: "preuve.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(200);
    expect(res.body.report.pdfFileName).toBe("preuve.pdf");
    expect(storageMocks.upload).toHaveBeenCalled();

    const stored = await prisma.report.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored.pdfPath).toBeTruthy();
    expect(stored.pdfUploadedAt).toBeTruthy();
  });

  it("rejects a non-PDF file", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const report = await createTestReport(hacker.authHeader, programme.id);

    const res = await request(app)
      .post(`/api/reports/${report.id}/pdf`)
      .set("Authorization", hacker.authHeader)
      .attach("file", Buffer.from("not a pdf"), { filename: "note.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
  });

  it("refuses to let a hacker attach a PDF to someone else's report", async () => {
    const owner = await createTestUser("hacker");
    const intruder = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const report = await createTestReport(owner.authHeader, programme.id);

    const res = await request(app)
      .post(`/api/reports/${report.id}/pdf`)
      .set("Authorization", intruder.authHeader)
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "steal.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(403);
  });
});

describe("Generated structured PDF export", () => {
  it("renders a real PDF document from the report's structured fields", async () => {
    const hacker = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const category = await prisma.vulnerabilityCategory.findUniqueOrThrow({ where: { key: "injection.sql" } });

    const createRes = await request(app)
      .post("/api/reports")
      .set("Authorization", hacker.authHeader)
      .send({
        title: "SQLi sur /search",
        description: "Injection SQL via le champ de recherche",
        severity: "critique",
        programmeId: programme.id,
        vulnerability: "SQLi",
        proof: "' OR 1=1 --",
        vulnerabilityCategoryId: category.id,
        affectedAsset: "search.gabon.ga",
        stepsToReproduce: "1. Aller sur /search\n2. Injecter le payload",
        impact: "Accès complet à la base de données",
        remediation: "Utiliser des requêtes préparées",
        cvssScore: 9.8,
        cvssVector: "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      });

    const res = await request(app)
      .get(`/api/reports/${createRes.body.report.id}/pdf`)
      .set("Authorization", hacker.authHeader);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    const buffer = res.body as Buffer;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("refuses PDF generation for a report the caller cannot view", async () => {
    const owner = await createTestUser("hacker");
    const intruder = await createTestUser("hacker");
    const entreprise = await createTestUser("entreprise");
    const entrepriseProfile = await prisma.entrepriseProfile.findUniqueOrThrow({ where: { profileId: entreprise.id } });
    const programme = await createTestProgramme(entrepriseProfile.id);
    const report = await createTestReport(owner.authHeader, programme.id);

    const res = await request(app)
      .get(`/api/reports/${report.id}/pdf`)
      .set("Authorization", intruder.authHeader);

    expect(res.status).toBe(403);
  });
});
