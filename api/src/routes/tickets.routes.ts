import { Router } from "express";
import { z } from "zod";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listTickets,
  getTicketById,
  createTicket,
  addTicketMessage,
  updateTicketStatus,
  deleteTicket,
} from "../services/tickets/ticketsService.js";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

// Staff-only list — matches the existing support.tickets.view page-access permission.
// (An individual user reading their own single ticket back is handled by GET /:id's
// ownership check in the service instead; there's no self-service "my tickets" list yet.)
ticketsRouter.get(
  "/",
  requirePermission("support.tickets.view"),
  asyncHandler(async (_req, res) => {
    const tickets = await listTickets();
    res.json({ tickets });
  }),
);

const createTicketSchema = z.object({
  subject: z.string().min(3),
  category: z.string().min(1),
  priority: z.nativeEnum(TicketPriority).optional(),
  message: z.string().min(1),
});

// Any authenticated user can open a ticket — it's their own support request.
ticketsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createTicketSchema.parse(req.body);
    const ticket = await createTicket(req.user!.id, body);
    res.status(201).json({ ticket });
  }),
);

ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticket = await getTicketById(req.params.id, req.user!);
    res.json({ ticket });
  }),
);

const addMessageSchema = z.object({ text: z.string().min(1) });

ticketsRouter.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const body = addMessageSchema.parse(req.body);
    const ticket = await addTicketMessage(req.params.id, req.user!, body.text);
    res.status(201).json({ ticket });
  }),
);

const updateStatusSchema = z.object({ status: z.nativeEnum(TicketStatus) });

ticketsRouter.patch(
  "/:id",
  requirePermission("tickets.manage"),
  asyncHandler(async (req, res) => {
    const body = updateStatusSchema.parse(req.body);
    const ticket = await updateTicketStatus(req.params.id, req.user!.id, body.status);
    res.json({ ticket });
  }),
);

ticketsRouter.delete(
  "/:id",
  requirePermission("tickets.manage"),
  asyncHandler(async (req, res) => {
    await deleteTicket(req.params.id, req.user!.id);
    res.status(204).send();
  }),
);
