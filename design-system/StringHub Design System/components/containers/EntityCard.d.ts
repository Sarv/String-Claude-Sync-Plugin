export interface EntityCardProps {
  icon?: string;
  /** Tile colour, a token e.g. "var(--color-warning-500)" (default brand) */
  color?: string;
  title: string;
  description?: string;
  stats?: { icon: string; label: string }[];
  /** Dashed "Create …" card */
  add?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMore?: (e: React.MouseEvent) => void;
}
export function EntityCard(props: EntityCardProps): JSX.Element;
