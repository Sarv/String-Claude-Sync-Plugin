export interface ConfirmDialogProps {
  open: boolean;
  tone?: "danger" | "warning" | "info" | "success";
  /** Name the thing being destroyed */
  title: React.ReactNode;
  /** Say it can't be undone */
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element | null;
