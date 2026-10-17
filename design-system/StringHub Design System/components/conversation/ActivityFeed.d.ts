export interface ActivityItem {
  icon?: string;
  tone?: "brand" | "success" | "danger" | "warning" | "info";
  /** Initial for an avatar marker instead of an icon */
  avatar?: string;
  avatarTone?: 1 | 2 | 3 | 4 | 5 | 6;
  text: React.ReactNode;
  when: React.ReactNode;
  quote?: React.ReactNode;
}
export interface ActivityFeedProps { items: ActivityItem[]; }
export function ActivityFeed(props: ActivityFeedProps): JSX.Element;
