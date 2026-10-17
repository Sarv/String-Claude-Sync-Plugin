export type TicketState = "open" | "in-progress" | "on-hold" | "resolved" | "closed";
export type TicketPriority = "urgent" | "high" | "medium" | "low" | "none";
/** Hashed avatar tone 1-7 = #7E7BDE #1976D2 #2E9E5A #E6A117 #D32F2F #0097A7 #8E24AA */
export interface TicketPerson { name: string; tone?: 1 | 2 | 3 | 4 | 5 | 6 | 7; }
export interface TicketTag { name: string; color: string; }
export interface Ticket {
  id: string; subject: string; state: TicketState; stateColor?: string; priority: TicketPriority;
  assignee?: TicketPerson; contact?: TicketPerson; tags?: TicketTag[]; replies?: number; updated?: string;
}
export interface TicketRowProps {
  ticket: Ticket;
  /** Conversation route layout: contact avatar + name/#KEY + subject, fields on hover */
  conversation?: boolean;
  /** open the ticket detail modal */
  onClick?: () => void;
  onReplies?: () => void;
}
export function TicketRow(props: TicketRowProps): JSX.Element;
