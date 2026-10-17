export interface RatioCellProps {
  /** Percentage 0–100 */
  value: number;
  /** Sample size */
  n: number;
  tone?: "success" | "warning" | "danger";
  minN?: number;
}
export function RatioCell(props: RatioCellProps): JSX.Element;
