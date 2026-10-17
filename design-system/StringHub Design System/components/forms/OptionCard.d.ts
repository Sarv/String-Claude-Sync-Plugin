export interface OptionCardProps {
  type?: "radio" | "checkbox";
  name?: string;
  title: React.ReactNode;
  /** e.g. "Recommended" */
  badge?: string;
  hint?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Shown only when checked */
  extra?: React.ReactNode;
}
export function OptionCard(props: OptionCardProps): JSX.Element;
