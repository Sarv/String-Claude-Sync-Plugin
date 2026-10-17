export interface StatePillProps {
  state?: "open" | "in-progress" | "on-hold" | "resolved" | "closed";
  onClick?: () => void;
}
export function StatePill(props: StatePillProps): JSX.Element;
