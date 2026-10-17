export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** custom-primary = everyday action (New/Save, lavender gradient, ONE per view) · custom-secondary = Cancel · custom-button = blue toolbar action · primary = solid violet single strong CTA · secondary = outlined neutral · secondary-small = 28px lilac · ghost · danger · outline-danger · tinted-danger · warning · accent (rare AI moments) · confirm-cancel (ConfirmDialog) */
  variant?: "custom-primary" | "custom-secondary" | "custom-button" | "primary" | "secondary" | "secondary-small" | "ghost" | "danger" | "outline-danger" | "tinted-danger" | "warning" | "accent" | "confirm-cancel";
  /** sm = 30px toolbars · md = 40px default · lg = 44px */
  size?: "sm" | "md" | "lg";
  /** Boxicons name shown before the label */
  icon?: string;
  /** Square icon-only button (needs aria-label) */
  iconOnly?: boolean;
  /** Spinner + disabled, keep the label */
  loading?: boolean;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
