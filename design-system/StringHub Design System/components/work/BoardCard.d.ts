export interface BoardCardProps {
  id: string;
  title: string;
  type?: "new" | "update" | "bug" | "feature" | "improvement";
  priority?: "urgent" | "critical" | "high" | "medium" | "low" | "none";
  due?: string;
  overdue?: boolean;
  comments?: number;
  /** "2/4" */
  subtasks?: string;
  /** Assignee initial */
  assignee?: string;
  assigneeTone?: 1 | 2 | 3 | 4 | 5 | 6;
  onClick?: () => void;
}
export function BoardCard(props: BoardCardProps): JSX.Element;
