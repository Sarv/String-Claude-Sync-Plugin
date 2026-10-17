export interface CellMainProps {
  name?: string;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  avatar?: boolean;
  tone?: 1 | 2 | 3 | 4 | 5 | 6 | "tint";
}
export function CellMain(props: CellMainProps): JSX.Element;
