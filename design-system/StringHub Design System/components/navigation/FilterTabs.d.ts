export interface FilterTabsProps {
  items: (string | { id: string; label: React.ReactNode; count?: number | string })[];
  value: string;
  onChange?: (id: string) => void;
  label?: string;
}
export function FilterTabs(props: FilterTabsProps): JSX.Element;
