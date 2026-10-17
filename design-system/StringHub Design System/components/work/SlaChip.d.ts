export interface SlaChipProps {
  state?: "running" | "breached" | "paused" | "met";
  children: React.ReactNode;
}
export function SlaChip(props: SlaChipProps): JSX.Element;
