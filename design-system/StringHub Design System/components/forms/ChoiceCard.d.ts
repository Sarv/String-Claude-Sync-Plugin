export interface ChoiceCardProps {
  /** 2-letter mark */
  mark: string;
  tone?: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  meta?: string;
  selected?: boolean;
  onClick?: () => void;
  /** Trailing ghost icon button */
  action?: React.ReactNode;
}
export function ChoiceCard(props: ChoiceCardProps): JSX.Element;
