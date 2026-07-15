import { randomUUID } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "../src/prisma.js";
import { registerTestToken } from "./setup.js";

export async function createTestUser(role: UserRole) {
  const id = randomUUID();
  const email = `test-${id}@example.com`;

  await prisma.profile.create({
    data: {
      id,
      email,
      name: "Test User",
      role,
      ...(role === "hacker" ? { hackerProfile: { create: {} } } : {}),
      ...(role === "entreprise" ? { entrepriseProfile: { create: { sector: "Test" } } } : {}),
    },
  });

  const token = `test-token-${id}`;
  registerTestToken(token, id);

  return { id, email, token, authHeader: `Bearer ${token}` };
}

export async function createTestProgramme(entrepriseProfileId: string) {
  return prisma.programme.create({
    data: {
      name: "Programme de test",
      description: "Description de test",
      entrepriseId: entrepriseProfileId,
      minReward: 10000,
      maxReward: 100000,
    },
  });
}
