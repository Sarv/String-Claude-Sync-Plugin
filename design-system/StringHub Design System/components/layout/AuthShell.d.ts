export interface AuthShellProps {
  logoSrc?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  foot?: React.ReactNode;
}
export function AuthShell(props: AuthShellProps): JSX.Element;
