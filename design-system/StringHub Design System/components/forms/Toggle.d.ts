export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** aria-label (the visible label lives in SettingRow) */
  label?: string;
}
export function Toggle(props: ToggleProps): JSX.Element;
