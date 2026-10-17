export interface DateFilterButtonProps {
  /** Boxicons name without bx-: "calendar" (Created), "history" (Updated) */
  icon?: string;
  label: string;
  /** e.g. "01 Sep – 15 Sep"; omit when no range is set */
  range?: string;
  onClick?: () => void;
}
export function DateFilterButton(props: DateFilterButtonProps): JSX.Element;
