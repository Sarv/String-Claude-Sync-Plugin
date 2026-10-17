export interface CalendarCell {
  num: number;
  outside?: boolean;
  today?: boolean;
  events?: { label: string; tone?: "success" | "warning" | "danger" | "info" | "accent" }[];
  /** Extra hidden count ("+2 more") */
  more?: number;
}
export interface CalendarViewProps {
  /** "September 2026" */
  month: string;
  cells: CalendarCell[];
  range?: "Week" | "Month";
  onRange?: (r: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
}
export function CalendarView(props: CalendarViewProps): JSX.Element;
