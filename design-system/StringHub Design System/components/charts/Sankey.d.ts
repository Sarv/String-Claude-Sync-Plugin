export interface SankeyProps {
  nodes: { id: string; label: string; col: number; value: number }[];
  links: { from: string; to: string; value: number }[];
  width?: number;
  height?: number;
}
export function Sankey(props: SankeyProps): JSX.Element;
