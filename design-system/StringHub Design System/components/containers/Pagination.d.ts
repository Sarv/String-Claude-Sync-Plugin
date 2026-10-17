export interface PaginationProps {
  from?: number | string;
  to?: number | string;
  total?: number | string;
  page?: number;
  pages?: number;
  onPage?: (page: number) => void;
  /** Override the left text ("Page 1 of 3") */
  label?: React.ReactNode;
}
export function Pagination(props: PaginationProps): JSX.Element;
