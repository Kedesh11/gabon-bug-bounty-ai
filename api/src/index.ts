import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { programmesRouter } from "./routes/programmes.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { hackersRouter } from "./routes/hackers.routes.js";
import { entreprisesRouter } from "./routes/entreprises.routes.js";
import { configRouter } from "./routes/config.routes.js";
import { rolesRouter } from "./routes/roles.routes.js";
import { taxonomyRouter } from "./routes/taxonomy.routes.js";
import { contentRouter } from "./routes/content.routes.js";
import { logsRouter } from "./routes/logs.routes.js";
import { ticketsRouter } from "./routes/tickets.routes.js";
import { kycRouter } from "./routes/kyc.routes.js";
import { complianceRouter } from "./routes/compliance.routes.js";
import { kbRouter } from "./routes/kb.routes.js";
import { fraudRouter } from "./routes/fraud.routes.js";
import { mcpAgentsRouter } from "./routes/mcpAgents.routes.js";
import { maintenanceRouter } from "./routes/maintenance.routes.js";
import { systemStatusRouter } from "./routes/systemStatus.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { payoutsRouter } from "./routes/payouts.routes.js";
import { stripeWebhookRouter, cinetpayWebhookRouter } from "./routes/webhooks.routes.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));

// Mounted before express.json(): Stripe webhook signature verification needs the
// raw, unparsed request body (see routes/webhooks.routes.ts).
app.use("/api/webhooks", stripeWebhookRouter);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/programmes", programmesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/hackers", hackersRouter);
app.use("/api/entreprises", entreprisesRouter);
app.use("/api/config", configRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/taxonomy", taxonomyRouter);
app.use("/api/content", contentRouter);
app.use("/api/logs", logsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/kyc", kycRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/kb", kbRouter);
app.use("/api/fraud", fraudRouter);
app.use("/api/mcp-agents", mcpAgentsRouter);
app.use("/api/maintenance-status", maintenanceRouter);
app.use("/api/system-status", systemStatusRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/payouts", payoutsRouter);
app.use("/api/webhooks", cinetpayWebhookRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}
