export interface AvatarProps {
  /** Person name — hashed to pick a stable tone g1–g6, first letter becomes the initial */
  name?: string;
  /** Override initials (e.g. "PS" for .tint avatars) */
  initials?: string;
  /** xs 20 · sm 24 (lists, cards) · md 32 · lg 40 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 1 teal · 2 burgundy · 3 charcoal green · 4 maroon · 5 shadow blue · 6 purple · "tint" soft brand · "none" */
  tone?: 1 | 2 | 3 | 4 | 5 | 6 | "tint" | "none";
  /** Violet header profile ring */
  ring?: boolean;
  square?: boolean;
  className?: string;
}
export function Avatar(props: AvatarProps): JSX.Element;
