import type { LogLevel, LogType, Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export interface CreatePlatformLogInput {
  type: LogType;
  level: LogLevel;
  message: string;
  source: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}

// Fire-and-forget by design: a logging failure must never take down the real action
// it's recording (role change, payout, login...), so this never throws — same
// defensive posture as the MCP pipeline (orchestrator.ts).
export async function createPlatformLog(input: CreatePlatformLogInput): Promise<void> {
  try {
    await prisma.platformLog.create({ data: input });
  } catch (err) {
    console.error("[logs] failed to write platform log:", err);
  }
}

export interface ListPlatformLogsFilters {
  type?: LogType;
  level?: LogLevel;
  userId?: string;
  limit?: number;
}

export async function listPlatformLogs(filters: ListPlatformLogsFilters = {}) {
  return prisma.platformLog.findMany({
    where: {
      type: filters.type,
      level: filters.level,
      userId: filters.userId,
    },
    orderBy: { timestamp: "desc" },
    take: filters.limit ?? 200,
  });
}
