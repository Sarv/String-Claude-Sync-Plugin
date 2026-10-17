export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right side of the head (ghost sm button, link) */
  actions?: React.ReactNode;
  /** .card-foot content (Cancel + Save) */
  footer?: React.ReactNode;
  /** Wrap children in .card-pad (default true) */
  padded?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Card(props: CardProps): JSX.Element;
