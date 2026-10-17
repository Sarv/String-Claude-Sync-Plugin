export interface TicketFilterValue { text: string; /** state / priority / tag colour */ color?: string; }
export interface TicketFilter { label: string; values: TicketFilterValue[]; }
export interface ListFiltersBarProps {
  filters?: TicketFilter[];
  onRemove?: (label: string, value: string) => void;
  onClearAll?: () => void;
  /** "Save View" (default) - pass null to hide */
  saveLabel?: string | null;
  onSave?: () => void;
}
export function ListFiltersBar(props: ListFiltersBarProps): JSX.Element;
