export interface BannerProps {
  tone?: "info" | "success" | "warning" | "danger" | "brand";
  /** Override the tone icon */
  icon?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Small buttons: warning → Button variant="warning" size="sm", danger → "tinted-danger" */
  actions?: React.ReactNode;
  onDismiss?: () => void;
  /** Full-width strip, no radius */
  page?: boolean;
}
export function Banner(props: BannerProps): JSX.Element;
