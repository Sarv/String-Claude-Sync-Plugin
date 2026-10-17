export type ItemState = "open" | "in-progress" | "on-hold" | "resolved" | "closed";
export type ItemPriority = "urgent" | "high" | "medium" | "low" | "none";
/** Hashed avatar tone 1-7 = #7E7BDE #1976D2 #2E9E5A #E6A117 #D32F2F #0097A7 #8E24AA */
export interface Person { name: string; tone?: 1 | 2 | 3 | 4 | 5 | 6 | 7; }
export interface ItemTag { name: string; color: string; }
export interface ListRecord {
  id: string; subject: string; state: ItemState; stateColor?: string; priority: ItemPriority;
  assignee?: Person; contact?: Person; tags?: ItemTag[]; replies?: number; updated?: string;
}
export interface ListBoardColumn { state: ItemState; label?: string; color?: string; items: ListRecord[]; /** 56px rail with a vertical label */ collapsed?: boolean; }
export interface ListBoardProps { columns: ListBoardColumn[]; onOpen?: (t: ListRecord) => void; onNew?: (state: string) => void; /** footer button, default "New Item" */ newLabel?: string; }
export function ListBoard(props: ListBoardProps): JSX.Element;
