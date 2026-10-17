export interface ListRowProps {
  id: string;
  title: string;
  priority?: string;
  assignee?: string;
  assigneeTone?: 1 | 2 | 3 | 4 | 5 | 6;
  date?: string;
  overdue?: boolean;
  onClick?: () => void;
}
export function ListRow(props: ListRowProps): JSX.Element;
