export interface HealthDotProps {
  tone?: "good" | "warning" | "quiet" | "inactive";
  label?: string;
}
export function HealthDot(props: HealthDotProps): JSX.Element;
