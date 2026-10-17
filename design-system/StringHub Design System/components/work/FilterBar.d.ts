export interface FilterBarProps {
  filters: { key: string; value: string; tone?: "success" | "danger" | "warning" | "info" | "neutral" }[];
  onRemove?: (filter: { key: string; value: string }, index: number) => void;
  onClear?: () => void;
  onAdd?: () => void;
}
export function FilterBar(props: FilterBarProps): JSX.Element;
