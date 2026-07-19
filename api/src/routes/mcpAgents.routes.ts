import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getMcpAgentStats } from "../services/mcpAgents/statsService.js";

export const mcpAgentsRouter = Router();

// Public: aggregate-only counts (no report content, no PII) for the marketing page.
mcpAgentsRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const stats = await getMcpAgentStats();
    res.json(stats);
  }),
);
