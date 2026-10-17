export interface ListActivityItem {
  initials: string;
  /** avatar tint */
  color?: string;
  /** type badge: created #7E7BDE bx-user · sla #ED6C02 bx-time-five · assigned #0288D1 bx-user-circle · priority #D32F2F bx-hash · state #2E7D32 bx-check-circle */
  icon?: string; badgeColor?: string;
  text: React.ReactNode;
  time: string;
}
export interface ListActivityProps { day?: string; items: ListActivityItem[]; }
export function ListActivity(props: ListActivityProps): JSX.Element;
