export interface BadgeProps {
  /** Neutral by default. brand = the ONE most important value (Owner/Admin). success/danger/info only when the label itself is a signal. accent = AI. */
  tone?: "brand" | "accent" | "success" | "danger" | "warning" | "info";
  children: React.ReactNode;
}
export function Badge(props: BadgeProps): JSX.Element;
