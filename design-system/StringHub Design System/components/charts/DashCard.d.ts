export interface DashCardProps {
  title: string;
  /** NOW pill for live numbers */
  live?: boolean;
  /** Tooltip text for the info glyph */
  info?: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  state?: "loading" | "empty" | "error";
  emptyText?: string;
  errorText?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}
export function DashCard(props: DashCardProps): JSX.Element;
