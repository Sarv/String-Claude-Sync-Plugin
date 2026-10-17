export interface AvatarGroupProps {
  names: string[];
  /** How many to show before the +N counter */
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
}
export function AvatarGroup(props: AvatarGroupProps): JSX.Element;
