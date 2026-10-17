export interface ToastProps {
  tone?: "success" | "info" | "warning" | "danger";
  title: React.ReactNode;
  message?: React.ReactNode;
  actions?: { label: string; onClick?: () => void }[];
  onDismiss?: () => void;
  /** No auto-dismiss timer bar */
  sticky?: boolean;
}
export function Toast(props: ToastProps): JSX.Element;
