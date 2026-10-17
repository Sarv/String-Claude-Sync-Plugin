export interface DropdownItem { label?: string; icon?: string; kbd?: string; danger?: boolean; divider?: boolean; header?: string; }
export interface DropdownMenuProps {
  label: string;
  icon?: string;
  items: DropdownItem[];
  /** Select-style: trigger shows the chosen value, items get a check */
  select?: boolean;
  value?: string;
  onSelect?: (label: string, item: DropdownItem) => void;
}
export function DropdownMenu(props: DropdownMenuProps): JSX.Element;
