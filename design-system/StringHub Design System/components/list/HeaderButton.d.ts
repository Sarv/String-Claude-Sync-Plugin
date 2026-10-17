export interface HeaderButtonProps {
  /** Boxicons name without the bx- prefix, e.g. "download", "upload", "git-merge" */
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
}
export function HeaderButton(props: HeaderButtonProps): JSX.Element;
