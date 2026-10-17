export interface PillNavProps {
  items: ({ id: string; label: React.ReactNode; icon?: string; count?: number | string } | { group: string })[];
  value: string;
  onChange?: (id: string) => void;
  variant?: "compact" | "vertical";
  label?: string;
}
export function PillNav(props: PillNavProps): JSX.Element;
