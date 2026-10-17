export interface EmptyStateProps {
  icon?: string;
  /** brand = first use · danger = error · success = all done */
  tone?: "brand" | "danger" | "success";
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Inside a table card */
  compact?: boolean;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
