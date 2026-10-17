export interface StatusProps {
  /** active = healthy/on (Active, Online, Live) · paused = waiting (Pending, Scheduled) · draft = off (Invited, Inactive) · error = broken (Failed, Blocked) · info */
  tone?: "active" | "paused" | "draft" | "error" | "info";
  pulse?: boolean;
  children: React.ReactNode;
}
export function Status(props: StatusProps): JSX.Element;
