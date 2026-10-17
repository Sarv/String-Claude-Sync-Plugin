export interface ToolbarSearchProps {
  value?: string;
  placeholder?: string;
  hint?: string;
  onChange?: (value: string) => void;
}
export function ToolbarSearch(props: ToolbarSearchProps): JSX.Element;
