export type ItemState = "open" | "in-progress" | "on-hold" | "resolved" | "closed";
export type ItemPriority = "urgent" | "high" | "medium" | "low" | "none";
/** Hashed avatar tone 1-7 = #7E7BDE #1976D2 #2E9E5A #E6A117 #D32F2F #0097A7 #8E24AA */
export interface Person { name: string; tone?: 1 | 2 | 3 | 4 | 5 | 6 | 7; }
export interface ItemTag { name: string; color: string; }
export interface ListRecord {
  id: string; subject: string; state: ItemState; stateColor?: string; priority: ItemPriority;
  assignee?: Person; contact?: Person; tags?: ItemTag[]; replies?: number; updated?: string;
}
export interface ListTableRow extends ListRecord { stateName?: string; channel?: { type: "email" | "chat" | "phone" | "api" | "portal"; name: string }; }
export interface ListTableProps {
  items: ListTableRow[];
  /** grid aria-label, default "Items" */
  label?: string;
  /** checked item ids; any -> bulk bar (Set State / Set Priority / Assign to, Merge, Clear) above the table */
  selected?: string[];
  onToggle?: (id: string) => void;
  onOpen?: (t: ListTableRow) => void;
  onClearSelection?: () => void;
}
export function ListTable(props: ListTableProps): JSX.Element;
