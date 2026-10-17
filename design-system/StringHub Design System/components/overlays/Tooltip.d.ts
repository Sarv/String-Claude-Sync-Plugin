export interface TooltipProps {
  tip: string;
  pos?: "bottom" | "right";
  children: React.ReactNode;
}
export function Tooltip(props: TooltipProps): JSX.Element;
