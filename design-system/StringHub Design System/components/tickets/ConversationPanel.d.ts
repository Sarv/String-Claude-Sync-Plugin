export interface ConversationMessage {
  side?: "in" | "out";
  text?: React.ReactNode;
  /** "10:24 AM" */
  meta?: string;
  by?: string;
  ai?: boolean; read?: boolean; selected?: boolean;
  /** private note (amber, centred) */
  note?: boolean;
  file?: { name: string; meta: string; pdf?: boolean };
}
export interface ConversationThread {
  /** "WhatsApp · +91 98200 11223" */
  label: string;
  /** "bxl-whatsapp" | "bx-envelope" | "bx-phone" … */
  icon: string;
  /** channel colour: WhatsApp #25D366, Email #8B5CF6, SMS #3B82F6, Instagram #E1306C, Call #F97316 */
  color: string;
  open?: boolean;
  messages: ConversationMessage[];
}
export interface ConversationPanelProps {
  threads: ConversationThread[];
  channel?: { name: string; icon: string };
  replyFrom?: string;
  placeholder?: string;
  onSend?: (text: string) => void;
}
export function ConversationPanel(props: ConversationPanelProps): JSX.Element;
