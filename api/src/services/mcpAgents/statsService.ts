import { prisma } from "../../prisma.js";

// Public, aggregate-only stats for the MCP agents marketing page (src/pages/MCPAgents.tsx)
// — real counts instead of the hardcoded "6"/"450+"/"96.1%" it used to ship with.
export async function getMcpAgentStats() {
  const [totalRuns, outputCounts] = await Promise.all([
    prisma.mcpAgentRun.count(),
    prisma.mcpAgentOutput.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totalOutputs = outputCounts.reduce((sum, o) => sum + o._count._all, 0);
  const completedOutputs = outputCounts.find((o) => o.status === "completed")?._count._all ?? 0;
  const completionRate = totalOutputs > 0 ? completedOutputs / totalOutputs : null;

  return { totalRuns, totalOutputs, completedOutputs, completionRate };
}
