export interface TabsProps {
  items: { id: string; label: React.ReactNode; count?: number | string }[];
  value: string;
  onChange?: (id: string) => void;
  label?: string;
}
export function Tabs(props: TabsProps): JSX.Element;
