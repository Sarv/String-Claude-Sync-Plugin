export interface PriorityPillProps {
  priority?: "urgent" | "high" | "medium" | "low" | "none";
  onClick?: () => void;
}
export function PriorityPill(props: PriorityPillProps): JSX.Element;
