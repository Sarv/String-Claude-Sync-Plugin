export interface SegmentedProps {
  items: (string | { id: string; label: React.ReactNode; icon?: string })[];
  value: string;
  onChange?: (id: string) => void;
  label?: string;
  width?: number | string;
}
export function Segmented(props: SegmentedProps): JSX.Element;
