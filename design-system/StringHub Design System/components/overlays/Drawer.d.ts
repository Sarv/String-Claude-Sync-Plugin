export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  /** default 60% · sm 520px (filters, quick forms) · lg 75% */
  size?: "sm" | "lg";
  icon?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** 4-up stat strip */
  stats?: { k: React.ReactNode; v: React.ReactNode }[];
  /** Usually <Tabs> */
  tabs?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}
export function Drawer(props: DrawerProps): JSX.Element | null;
