export interface ProgressBarProps {
  /** 0–100 */
  value?: number;
  tone?: "success" | "warning" | "danger";
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  /** 6px */
  large?: boolean;
  /** 2px refetch strip */
  indeterminate?: boolean;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
