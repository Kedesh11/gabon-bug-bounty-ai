-- CreateEnum
CREATE TYPE "McpAgentType" AS ENUM ('vulnerability_analysis', 'severity_assessment', 'false_positive_detection', 'anti_fraud', 'recommendation', 'decision', 'reward');

-- CreateEnum
CREATE TYPE "McpAgentRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- AlterEnum
ALTER TYPE "FraudSignalType" ADD VALUE 'llm_semantic_anomaly';

-- CreateTable
CREATE TABLE "mcp_agent_runs" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "status" "McpAgentRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_agent_outputs" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "agentType" "McpAgentType" NOT NULL,
    "model" TEXT NOT NULL,
    "status" "McpAgentRunStatus" NOT NULL DEFAULT 'pending',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "rawResponse" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_agent_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_agent_outputs_runId_agentType_key" ON "mcp_agent_outputs"("runId", "agentType");

-- AddForeignKey
ALTER TABLE "mcp_agent_runs" ADD CONSTRAINT "mcp_agent_runs_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_agent_outputs" ADD CONSTRAINT "mcp_agent_outputs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "mcp_agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
