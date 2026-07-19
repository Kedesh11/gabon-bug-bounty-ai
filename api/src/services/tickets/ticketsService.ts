import type { TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { AuthenticatedUser } from "../../middleware/auth.js";
import { createPlatformLog } from "../platformLogs/logsService.js";

const ticketInclude = {
  author: { select: { id: true, name: true, email: true } },
  messages: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, email: true } } },
  },
};

function canManageTickets(user: AuthenticatedUser) {
  return user.permissions.includes("tickets.manage");
}

async function assertCanView(user: AuthenticatedUser, ticket: { authorId: string }) {
  if (canManageTickets(user) || user.permissions.includes("support.tickets.view")) return;
  if (ticket.authorId === user.id) return;
  throw new HttpError(403, "Accès refusé à ce ticket");
}

export async function listTickets() {
  return prisma.ticket.findMany({ include: ticketInclude, orderBy: { createdAt: "desc" } });
}

export async function getTicketById(id: string, user: AuthenticatedUser) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  await assertCanView(user, ticket);
  return ticket;
}

export interface CreateTicketInput {
  subject: string;
  category: string;
  priority?: TicketPriority;
  message: string;
}

// Any authenticated user can open a ticket — it's their own support request, not a
// staff action. The first message is required (a ticket with no content isn't
// actionable) and is created in the same transaction as the ticket itself.
export async function createTicket(authorId: string, input: CreateTicketInput) {
  return prisma.ticket.create({
    data: {
      subject: input.subject,
      category: input.category,
      priority: input.priority ?? "moyenne",
      authorId,
      messages: { create: { authorId, text: input.message } },
    },
    include: ticketInclude,
  });
}

// Staff and the ticket's own author can both reply. Only a staff reply (someone with
// tickets.manage) moves an "ouvert" ticket to "en_cours" — the author replying to
// their own still-open ticket shouldn't silently change its status.
export async function addTicketMessage(id: string, user: AuthenticatedUser, text: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");

  const isStaff = canManageTickets(user);
  if (!isStaff && ticket.authorId !== user.id) throw new HttpError(403, "Accès refusé à ce ticket");

  await prisma.ticketMessage.create({ data: { ticketId: id, authorId: user.id, text } });

  if (isStaff && ticket.status === "ouvert") {
    await prisma.ticket.update({ where: { id }, data: { status: "en_cours" } });
  }

  return prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
}

export async function updateTicketStatus(id: string, actorId: string, status: TicketStatus) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Ticket introuvable");

  const updated = await prisma.ticket.update({ where: { id }, data: { status }, include: ticketInclude });

  await createPlatformLog({
    type: "user_action",
    level: "info",
    message: `Ticket "${updated.subject}" passé au statut "${status}"`,
    source: "ticketsService",
    userId: actorId,
  });

  return updated;
}

export async function deleteTicket(id: string, actorId: string) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Ticket introuvable");

  await prisma.ticket.delete({ where: { id } });

  await createPlatformLog({
    type: "user_action",
    level: "warning",
    message: `Ticket "${existing.subject}" supprimé`,
    source: "ticketsService",
    userId: actorId,
  });
}
