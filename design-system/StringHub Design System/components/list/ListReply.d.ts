export interface ListReplyProps {
  role?: "customer" | "employee" | "internal";
  name: string;
  tone?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** "22 Sep 2026 10:24 AM" */
  time: string;
  emailed?: boolean;
  /** show Edit / Delete */
  own?: boolean;
  children: React.ReactNode;
}
export function ListReply(props: ListReplyProps): JSX.Element;
