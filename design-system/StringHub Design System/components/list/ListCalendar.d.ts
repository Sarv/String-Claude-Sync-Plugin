export interface ListCalendarDay {
  /** day number, or "01 Sep" on the 1st */
  label: string | number;
  other?: boolean; today?: boolean;
  items?: { subject: string; state?: string; color?: string }[];
  /** hidden count -> "Load more (N more)" */
  more?: number;
}
export interface ListCalendarProps { title?: string; /** Lay out by field */ field?: string; days: ListCalendarDay[]; warning?: string; onOpen?: (t: object) => void; /** hover button in a day cell, default "New Item" */ newLabel?: string; }
export function ListCalendar(props: ListCalendarProps): JSX.Element;
