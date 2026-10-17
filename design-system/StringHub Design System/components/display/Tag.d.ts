export interface TagProps {
  tone?: "success" | "danger" | "warning" | "info" | "accent";
  children: React.ReactNode;
}
export function Tag(props: TagProps): JSX.Element;
