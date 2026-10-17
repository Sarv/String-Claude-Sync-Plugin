export interface PickCardProps {
  icon?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}
export function PickCard(props: PickCardProps): JSX.Element;
