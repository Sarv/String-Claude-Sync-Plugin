export interface ListItemProps {
  name?: string;
  tone?: 1 | 2 | 3 | 4 | 5 | 6;
  title: React.ReactNode;
  meta?: React.ReactNode;
  sub?: React.ReactNode;
  active?: boolean;
  unread?: boolean;
  onClick?: () => void;
}
export function ListItem(props: ListItemProps): JSX.Element;
