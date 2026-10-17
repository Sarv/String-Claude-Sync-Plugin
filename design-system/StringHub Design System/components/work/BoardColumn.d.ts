export interface BoardColumnProps {
  /** Task status key — sets the dot colour and default title */
  status?: "backlog" | "unstarted" | "started" | "in-progress" | "in-review" | "completed" | "cancelled" | "on-hold";
  title?: string;
  count?: number;
  onAdd?: () => void;
  children?: React.ReactNode;
}
export function BoardColumn(props: BoardColumnProps): JSX.Element;
