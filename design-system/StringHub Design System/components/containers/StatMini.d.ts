export interface StatMiniProps {
  tone?: "brand" | "success" | "danger" | "warning" | "info" | "accent";
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}
export function StatMini(props: StatMiniProps): JSX.Element;
