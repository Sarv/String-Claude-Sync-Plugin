export interface ChatMessageProps {
  from?: "customer" | "agent" | "note";
  name: string;
  initials?: string;
  /** Badge next to the name (defaults by from) */
  role?: string;
  time?: string;
  attachment?: { name: string; size?: string };
  children: React.ReactNode;
}
export function ChatMessage(props: ChatMessageProps): JSX.Element;
