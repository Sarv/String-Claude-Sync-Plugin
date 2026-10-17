export interface ViewToggleOption { value: string; icon: string; label: string; }
export interface ViewToggleProps {
  value?: string;
  /** defaults to List (list-ul) + Split (sidebar) */
  options?: ViewToggleOption[];
  onChange?: (value: string) => void;
}
export function ViewToggle(props: ViewToggleProps): JSX.Element;
