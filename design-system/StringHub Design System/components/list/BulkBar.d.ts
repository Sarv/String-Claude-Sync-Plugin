export interface BulkAction {
  label: string;
  /** Boxicons name without bx- */
  icon?: string;
  /** shows a ▾ (opens a picker) */
  menu?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
export interface BulkBarProps { count: number; actions?: BulkAction[]; onClear?: () => void; }
export function BulkBar(props: BulkBarProps): JSX.Element;
