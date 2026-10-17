export interface ListHeaderBarProps {
  desk?: string;
  /** defaults to "List" ("Conversation" on the conversation route); pass "Tickets", "Tasks" or a saved view's name */
  title?: string;
  count?: number;
  view?: "list" | "board" | "calendar" | "table" | "gallery";
  onViewChange?: (view: string) => void;
  /** Conversation route: indigo accent (#4C46B3), forum icon */
  conversation?: boolean;
  spam?: "Active" | "Only";
  /** primary button text, default "New Item" (e.g. "New Ticket") */
  newLabel?: string;
  onNew?: () => void; onFilter?: () => void; onDisplay?: () => void; onExport?: () => void;
}
export function ListHeaderBar(props: ListHeaderBarProps): JSX.Element;
