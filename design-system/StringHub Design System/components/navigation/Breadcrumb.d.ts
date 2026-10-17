export interface BreadcrumbProps {
  /** Last item is the current page */
  items: { label: React.ReactNode; href?: string; onClick?: (e: React.MouseEvent) => void }[];
}
export function Breadcrumb(props: BreadcrumbProps): JSX.Element;
