export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Boxicons name */
  icon: string;
  /** Accessible label (required for icon-only buttons) */
  label: string;
  /** md = 36px header button · sm = 28px row action */
  size?: "md" | "sm";
}
export function IconButton(props: IconButtonProps): JSX.Element;
