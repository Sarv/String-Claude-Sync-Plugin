export interface TopbarProps {
  onToggleSidebar?: () => void;
  /** true = default search box; or pass a node (SearchTrigger) */
  search?: boolean | React.ReactNode;
  /** Extra items before the icon buttons */
  children?: React.ReactNode;
  avatar?: string;
  onToggleTheme?: () => void;
  onBell?: () => void;
}
export function Topbar(props: TopbarProps): JSX.Element;
