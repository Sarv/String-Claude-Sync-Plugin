export interface StatusToggleProps {
  value?: string;
  options?: { value: string; label: string }[];
  size?: "lg";
  onChange?: (value: string) => void;
}
export function StatusToggle(props: StatusToggleProps): JSX.Element;
