export interface AppShellProps {
  nav: ({ id: string; label: string; icon: string } | { group: string })[];
  active?: string;
  onNavigate?: (id: string) => void;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
  logoSrc?: string;
  /** Custom <Topbar> */
  topbar?: React.ReactNode;
  children?: React.ReactNode;
  /** Wrap children in <main className="page"> (false for SettingsShell / SplitView) */
  page?: boolean;
}
export function AppShell(props: AppShellProps): JSX.Element;
