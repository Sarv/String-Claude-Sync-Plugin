export interface OptionChipsProps {
  options: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  single?: boolean;
  label?: string;
}
export function OptionChips(props: OptionChipsProps): JSX.Element;
