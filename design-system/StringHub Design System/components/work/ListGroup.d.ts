export interface ListGroupProps {
  status?: string;
  label?: string;
  count?: number;
  open?: boolean;
  children?: React.ReactNode;
}
export function ListGroup(props: ListGroupProps): JSX.Element;
