export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  size?: "sm" | "md" | "lg";
  /** Head icon tile */
  icon?: string;
  tone?: "danger" | "warning" | "success" | "info";
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Cancel (custom-secondary) + primary action */
  footer?: React.ReactNode;
}
export function Modal(props: ModalProps): JSX.Element | null;
