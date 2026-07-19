import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { createTestUser } from "./helpers.js";

describe("POST /api/tickets — any authenticated user can open one", () => {
  it("lets a hacker create a ticket with an initial message", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "Appel sur rapport", category: "Litige Prime", priority: "critique", message: "Je conteste le triage." });

    expect(res.status).toBe(201);
    expect(res.body.ticket.subject).toBe("Appel sur rapport");
    expect(res.body.ticket.status).toBe("ouvert");
    expect(res.body.ticket.author.id).toBe(hacker.id);
    expect(res.body.ticket.messages.length).toBe(1);
    expect(res.body.ticket.messages[0].text).toBe("Je conteste le triage.");
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/tickets").send({ subject: "X", category: "Technique", message: "Y" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/tickets — staff-only list", () => {
  it("rejects a caller without support.tickets.view", async () => {
    const hacker = await createTestUser("hacker");
    const res = await request(app).get("/api/tickets").set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("allows support staff", async () => {
    const support = await createTestUser("support");
    const res = await request(app).get("/api/tickets").set("Authorization", support.authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);
  });
});

describe("GET /api/tickets/:id — ownership rules", () => {
  it("lets the ticket's own author read it back even without support.tickets.view", async () => {
    const hacker = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "Mon ticket", category: "Technique", message: "Bonjour" });

    const res = await request(app).get(`/api/tickets/${created.body.ticket.id}`).set("Authorization", hacker.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe(created.body.ticket.id);
  });

  it("rejects a different hacker reading someone else's ticket", async () => {
    const owner = await createTestUser("hacker");
    const stranger = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", owner.authHeader)
      .send({ subject: "Privé", category: "Technique", message: "Bonjour" });

    const res = await request(app).get(`/api/tickets/${created.body.ticket.id}`).set("Authorization", stranger.authHeader);
    expect(res.status).toBe(403);
  });

  it("404s for an unknown ticket id", async () => {
    const support = await createTestUser("support");
    const res = await request(app).get("/api/tickets/00000000-0000-0000-0000-000000000000").set("Authorization", support.authHeader);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/messages — replies", () => {
  it("lets the author reply without moving status off 'ouvert'", async () => {
    const hacker = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "Suivi", category: "Technique", message: "Premier message" });

    const res = await request(app)
      .post(`/api/tickets/${created.body.ticket.id}/messages`)
      .set("Authorization", hacker.authHeader)
      .send({ text: "Toujours en attente ?" });

    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("ouvert");
    expect(res.body.ticket.messages.length).toBe(2);
  });

  it("moves status to en_cours when staff replies to an open ticket", async () => {
    const hacker = await createTestUser("hacker");
    const support = await createTestUser("support");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "Suivi 2", category: "Technique", message: "Premier message" });

    const res = await request(app)
      .post(`/api/tickets/${created.body.ticket.id}/messages`)
      .set("Authorization", support.authHeader)
      .send({ text: "Nous regardons ça." });

    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("en_cours");
  });

  it("rejects a stranger (no tickets.manage, not the author) from replying", async () => {
    const owner = await createTestUser("hacker");
    const stranger = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", owner.authHeader)
      .send({ subject: "Privé 2", category: "Technique", message: "Bonjour" });

    const res = await request(app)
      .post(`/api/tickets/${created.body.ticket.id}/messages`)
      .set("Authorization", stranger.authHeader)
      .send({ text: "Je m'incruste" });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/tickets/:id — resolve, staff-only", () => {
  it("rejects a caller without tickets.manage", async () => {
    const hacker = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "À résoudre", category: "Technique", message: "Bonjour" });

    const res = await request(app)
      .patch(`/api/tickets/${created.body.ticket.id}`)
      .set("Authorization", hacker.authHeader)
      .send({ status: "resolu" });
    expect(res.status).toBe(403);
  });

  it("lets support mark a ticket resolved", async () => {
    const hacker = await createTestUser("hacker");
    const support = await createTestUser("support");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "À résoudre 2", category: "Technique", message: "Bonjour" });

    const res = await request(app)
      .patch(`/api/tickets/${created.body.ticket.id}`)
      .set("Authorization", support.authHeader)
      .send({ status: "resolu" });
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe("resolu");
  });
});

describe("DELETE /api/tickets/:id — staff-only", () => {
  it("rejects a caller without tickets.manage", async () => {
    const hacker = await createTestUser("hacker");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "À supprimer", category: "Technique", message: "Bonjour" });

    const res = await request(app).delete(`/api/tickets/${created.body.ticket.id}`).set("Authorization", hacker.authHeader);
    expect(res.status).toBe(403);
  });

  it("lets support delete a ticket", async () => {
    const hacker = await createTestUser("hacker");
    const support = await createTestUser("support");
    const created = await request(app)
      .post("/api/tickets")
      .set("Authorization", hacker.authHeader)
      .send({ subject: "À supprimer 2", category: "Technique", message: "Bonjour" });

    const deleteRes = await request(app).delete(`/api/tickets/${created.body.ticket.id}`).set("Authorization", support.authHeader);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/tickets/${created.body.ticket.id}`).set("Authorization", support.authHeader);
    expect(getRes.status).toBe(404);
  });
});
