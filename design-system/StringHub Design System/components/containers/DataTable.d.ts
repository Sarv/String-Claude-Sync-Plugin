export interface DataTableColumn<T = any> {
  key: string;
  label: React.ReactNode;
  /** "actions" right-aligns · "muted" secondary text */
  className?: string;
  cellClassName?: string;
  width?: number | string;
  render?: (row: T) => React.ReactNode;
}
export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** 5px dense rows */
  compact?: boolean;
  /** Pagination under the table */
  footer?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  /** Rendered when rows is empty (EmptyState compact) */
  empty?: React.ReactNode;
}
export function DataTable<T = any>(props: DataTableProps<T>): JSX.Element;
