export interface SettingsShellProps {
  entity?: { mark: string; name: string };
  nav: ({ id: string; label: string; icon: string } | { group: string })[];
  active?: string;
  onNavigate?: (id: string) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}
export function SettingsShell(props: SettingsShellProps): JSX.Element;
