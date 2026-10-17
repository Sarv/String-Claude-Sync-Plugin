export interface HoverCardProps {
  trigger: React.ReactNode;
  title?: React.ReactNode;
  rows?: [React.ReactNode, React.ReactNode][];
  description?: React.ReactNode;
}
export function HoverCard(props: HoverCardProps): JSX.Element;
