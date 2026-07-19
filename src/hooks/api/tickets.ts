import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export type TicketStatus = "ouvert" | "en_cours" | "resolu";
export type TicketPriority = "critique" | "haute" | "moyenne" | "basse";

export interface TicketAuthor {
  id: string;
  name: string;
  email: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  author: TicketAuthor;
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  authorId: string;
  author: TicketAuthor;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const KEY = ["tickets"] as const;

export function useTickets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { tickets } = await apiFetch<{ tickets: Ticket[] }>("/api/tickets");
      return tickets;
    },
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { ticket } = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${id}`);
      return ticket;
    },
    enabled: !!id,
  });
}

export interface CreateTicketInput {
  subject: string;
  category: string;
  priority?: TicketPriority;
  message: string;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { ticket } = await apiFetch<{ ticket: Ticket }>("/api/tickets", { method: "POST", body: input });
      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { ticket } = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${id}/messages`, { method: "POST", body: { text } });
      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { ticket } = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${id}`, { method: "PATCH", body: { status } });
      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/tickets/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
