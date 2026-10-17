export interface FilterSelectProps {
  /** Boxicons name without bx-, e.g. "filter-alt" (only for the primary quick filter) */
  icon?: string;
  value?: string;
  options: (string | { value: string; label: string })[];
  label?: string;
  onChange?: (value: string) => void;
}
export function FilterSelect(props: FilterSelectProps): JSX.Element;
