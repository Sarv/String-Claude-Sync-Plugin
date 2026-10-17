export type TicketState = "open" | "in-progress" | "on-hold" | "resolved" | "closed";
export type TicketPriority = "urgent" | "high" | "medium" | "low" | "none";
/** Hashed avatar tone 1-7 = #7E7BDE #1976D2 #2E9E5A #E6A117 #D32F2F #0097A7 #8E24AA */
export interface TicketPerson { name: string; tone?: 1 | 2 | 3 | 4 | 5 | 6 | 7; }
export interface TicketTag { name: string; color: string; }
export interface Ticket {
  id: string; subject: string; state: TicketState; stateColor?: string; priority: TicketPriority;
  assignee?: TicketPerson; contact?: TicketPerson; tags?: TicketTag[]; replies?: number; updated?: string;
}
export interface TicketListGroupProps {
  state?: TicketState; label?: string; color?: string; count: number;
  /** up to 3 unique assignees */
  avatars?: TicketPerson[];
  children: React.ReactNode;
  onNew?: () => void;
  defaultOpen?: boolean;
}
export function TicketListGroup(props: TicketListGroupProps): JSX.Element;
