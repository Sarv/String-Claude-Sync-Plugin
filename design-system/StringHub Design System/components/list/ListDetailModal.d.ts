export interface ListDetailModalProps {
  open?: boolean;
  /** render in place (no backdrop) */
  inline?: boolean;
  onClose?: () => void;
  item: { id: string; subject: string };
  /** "Item" -> "Item 1 of 128"; pass "Ticket", "Task"… */
  itemLabel?: string;
  /** tab-bar button, default "New Item" */
  newLabel?: string;
  breadcrumb?: string[];
  index?: number; total?: number;
  editedBy?: string;
  /** Breakdown rail: [{name, icon: "bxl-whatsapp", color: "#25D366", count}] */
  channels?: { name: string; icon: string; color: string; count: number }[];
  /** right column - usually <PropsPanel card={false} sections=[…] /> */
  sidebar?: React.ReactNode;
  tab?: "conversation" | "form" | "attachment" | "activity";
  onTabChange?: (tab: string) => void;
  /** active tab content - ConversationPanel for "conversation" */
  children?: React.ReactNode;
}
export function ListDetailModal(props: ListDetailModalProps): JSX.Element | null;
