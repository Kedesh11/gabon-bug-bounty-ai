import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";

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
