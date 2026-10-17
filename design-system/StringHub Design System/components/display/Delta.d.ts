export interface DeltaProps {
  /** up = good (green) · down = bad (red) · flat = grey. Choose by good/bad, not by sign. */
  dir?: "up" | "down" | "flat";
  children: React.ReactNode;
}
export function Delta(props: DeltaProps): JSX.Element;
