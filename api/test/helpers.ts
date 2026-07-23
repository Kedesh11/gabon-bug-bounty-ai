import { randomUUID } from "node:crypto";
import { prisma } from "../src/prisma.js";
import { registerTestToken } from "./setup.js";

export async function createTestUser(roleKey: string) {
  const id = randomUUID();
  const email = `test-${id}@example.com`;

  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });

  await prisma.profile.create({
    data: {
      id,
      email,
      name: "Test User",
      roleId: role.id,
      ...(roleKey === "hacker" ? { hackerProfile: { create: {} } } : {}),
      ...(roleKey === "entreprise" ? { entrepriseProfile: { create: { sector: "Test" } } } : {}),
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
      slug: `programme-de-test-${randomUUID()}`,
      description: "Description de test",
      entrepriseId: entrepriseProfileId,
      minReward: 10000,
      maxReward: 100000,
    },
  });
}
