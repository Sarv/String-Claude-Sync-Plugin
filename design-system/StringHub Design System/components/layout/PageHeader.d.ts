export interface PageHeaderProps {
  breadcrumb?: (string | { label: string; onClick?: () => void })[];
  title: React.ReactNode;
  count?: number | string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** White strip across the top (default true); false for detail pages */
  bar?: boolean;
  /** Avatar before the heading (detail pages) */
  leading?: React.ReactNode;
  /** Row under the title (pills) */
  meta?: React.ReactNode;
}
export function PageHeader(props: PageHeaderProps): JSX.Element;
