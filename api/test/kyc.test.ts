import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("POST /api/kyc/documents — self-service submission", () => {
  it("lets a hacker submit their own document", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "passeport_recto", fileName: "passeport.jpg" });

    expect(res.status).toBe(201);
    expect(res.body.document.type).toBe("passeport_recto");
    expect(res.body.document.status).toBe("en_attente");
    expect(res.body.document.subject.id).toBe(hacker.id);
  });

  it("re-submitting the same type replaces the previous row instead of duplicating", async () => {
    const hacker = await createTestUser("hacker");
    const first = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "photo_identite", fileName: "v1.jpg" });

    const second = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "photo_identite", fileName: "v2.jpg" });

    expect(second.body.document.id).toBe(first.body.document.id);
    expect(second.body.document.fileName).toBe("v2.jpg");

    const mine = await request(app).get("/api/kyc/documents/mine").set("Authorization", hacker.authHeader);
    expect(mine.body.documents.filter((d: { type: string }) => d.type === "photo_identite").length).toBe(1);
  });

  it("resets a previously-reviewed document back to en_attente on resubmission", async () => {
    const hacker = await createTestUser("hacker");
    const support = await createTestUser("support");
    const created = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "justificatif_domicile" });

    await request(app)
      .patch(`/api/kyc/documents/${created.body.document.id}`)
      .set("Authorization", support.authHeader)
      .send({ status: "rejete", reviewNote: "Illisible" });

    const resubmitted = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "justificatif_domicile" });

    expect(resubmitted.body.document.status).toBe("en_attente");
    expect(resubmitted.body.document.reviewedBy).toBeNull();
  });
});

describe("GET /api/kyc/documents — staff-only list", () => {
  it("rejects a caller without users.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/kyc/documents").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("allows support, filterable by status and subjectId", async () => {
    const hackerA = await createTestUser("hacker");
    const hackerB = await createTestUser("hacker");
    const support = await createTestUser("support");

    await request(app).post("/api/kyc/documents").set("Authorization", hackerA.authHeader).send({ type: "passeport_recto" });
    await request(app).post("/api/kyc/documents").set("Authorization", hackerB.authHeader).send({ type: "photo_identite" });

    const all = await request(app).get("/api/kyc/documents").set("Authorization", support.authHeader);
    expect(all.status).toBe(200);
    expect(all.body.documents.length).toBeGreaterThanOrEqual(2);

    const filteredByStatus = await request(app).get("/api/kyc/documents?status=en_attente").set("Authorization", support.authHeader);
    expect(filteredByStatus.body.documents.every((d: { status: string }) => d.status === "en_attente")).toBe(true);

    const filteredBySubject = await request(app).get(`/api/kyc/documents?subjectId=${hackerA.id}`).set("Authorization", support.authHeader);
    expect(filteredBySubject.body.documents.every((d: { subject: { id: string } }) => d.subject.id === hackerA.id)).toBe(true);
  });
});

describe("PATCH /api/kyc/documents/:id — review, staff-only", () => {
  it("rejects a caller without kyc.review", async () => {
    const hacker = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "passeport_recto" });

    const res = await request(app)
      .patch(`/api/kyc/documents/${created.body.document.id}`)
      .set("Authorization", hacker.authHeader)
      .send({ status: "valide" });
    expect(res.status).toBe(403);
  });

  it("lets support approve a document and records who reviewed it", async () => {
    const hacker = await createTestUser("hacker");
    const support = await createTestUser("support");
    const created = await request(app)
      .post("/api/kyc/documents")
      .set("Authorization", hacker.authHeader)
      .send({ type: "passeport_verso" });

    const res = await request(app)
      .patch(`/api/kyc/documents/${created.body.document.id}`)
      .set("Authorization", support.authHeader)
      .send({ status: "valide" });

    expect(res.status).toBe(200);
    expect(res.body.document.status).toBe("valide");
    expect(res.body.document.reviewedBy.id).toBe(support.id);
    expect(res.body.document.reviewedAt).toBeTruthy();
  });

  it("404s for an unknown document id", async () => {
    const support = await createTestUser("support");
    const res = await request(app)
      .patch("/api/kyc/documents/00000000-0000-0000-0000-000000000000")
      .set("Authorization", support.authHeader)
      .send({ status: "valide" });
    expect(res.status).toBe(404);
  });
});
