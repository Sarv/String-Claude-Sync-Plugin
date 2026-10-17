export interface StatCardProps {
  label: string;
  icon?: string;
  value: React.ReactNode;
  delta?: string;
  deltaDir?: "up" | "down" | "flat";
  sub?: React.ReactNode;
}
export function StatCard(props: StatCardProps): JSX.Element;
