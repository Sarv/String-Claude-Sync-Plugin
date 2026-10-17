export interface SidebarProps {
  nav: ({ id: string; label: string; icon: string } | { group: string })[];
  active?: string;
  onNavigate?: (id: string) => void;
  /** 65px icon rail; labels become tooltips */
  collapsed?: boolean;
  /** Path to the StringHub mark (copy assets/stringhub-mark.svg) */
  logoSrc?: string;
  brand?: string;
}
export function Sidebar(props: SidebarProps): JSX.Element;
